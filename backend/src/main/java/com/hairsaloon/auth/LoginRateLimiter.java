package com.hairsaloon.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

@Component
class LoginRateLimiter {
    private static final DefaultRedisScript<List> INCREMENT = new DefaultRedisScript<>(
        "local n=redis.call('INCR',KEYS[1]); "
            + "if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; "
            + "return {n,redis.call('TTL',KEYS[1])}", List.class);

    private final StringRedisTemplate redis;
    private final AuthHmacService hmac;
    private final AuthProperties.RateLimit config;
    private final ConcurrentHashMap<String, AttemptRecord> fallback = new ConcurrentHashMap<>();

    LoginRateLimiter(StringRedisTemplate redis, AuthHmacService hmac, AuthProperties properties) {
        this.redis = redis;
        this.hmac = hmac;
        this.config = properties.getRateLimit();
        if (config.getMaxAttempts() < 1 || invalid(config.getWindow())) {
            throw new IllegalStateException("Auth rate-limit settings must be positive");
        }
    }

    Decision check(String scope, String clientIp, String normalizedPrincipal) {
        List<String> keys = keys(scope, clientIp, normalizedPrincipal);
        if (config.isRedisEnabled()) {
            try {
                long retry = 0;
                boolean blocked = false;
                for (String key : keys) {
                    String countValue = redis.opsForValue().get(key);
                    if (countValue != null && Long.parseLong(countValue) >= config.getMaxAttempts()) {
                        blocked = true;
                        Long ttl = redis.getExpire(key);
                        retry = Math.max(retry, ttl == null ? 1 : Math.max(1, ttl));
                    }
                }
                return new Decision(blocked, retry);
            } catch (RuntimeException unavailable) {
                // Redis is the primary store; an isolated in-process limiter keeps auth available.
            }
        }
        return fallbackCheck(keys);
    }

    void recordFailure(String scope, String clientIp, String normalizedPrincipal) {
        List<String> keys = keys(scope, clientIp, normalizedPrincipal);
        if (config.isRedisEnabled()) {
            try {
                for (String key : keys) {
                    List<?> result = redis.execute(INCREMENT, List.of(key),
                        Long.toString(Math.max(1, config.getWindow().toSeconds())));
                    if (result == null) {
                        throw new IllegalStateException("Redis rate-limit script returned no result");
                    }
                }
                return;
            } catch (RuntimeException unavailable) {
                // Fall through to the local atomic counters.
            }
        }
        Instant now = Instant.now();
        for (String key : keys) {
            fallback.compute(key, (ignored, current) -> current == null || current.expired(now)
                ? new AttemptRecord(1, now.plus(config.getWindow()))
                : new AttemptRecord(current.count + 1, current.expiresAt));
        }
    }

    void recordSuccess(String scope, String clientIp, String normalizedPrincipal) {
        List<String> keys = keys(scope, clientIp, normalizedPrincipal);
        if (config.isRedisEnabled()) {
            try {
                redis.delete(keys);
            } catch (RuntimeException unavailable) {
                // Local cleanup below is always safe.
            }
        }
        keys.forEach(fallback::remove);
    }

    void clear() {
        fallback.clear();
        if (!config.isRedisEnabled()) return;
        try {
            Set<String> keys = redis.keys(config.getKeyPrefix() + "*");
            if (keys != null && !keys.isEmpty()) redis.delete(keys);
        } catch (DataAccessException unavailable) {
            // clear() remains useful in tests and during Redis outages.
        }
    }

    private Decision fallbackCheck(List<String> keys) {
        Instant now = Instant.now();
        long retry = 0;
        boolean blocked = false;
        for (String key : keys) {
            AttemptRecord record = fallback.get(key);
            if (record != null && record.expired(now)) {
                fallback.remove(key, record);
                record = null;
            }
            if (record != null && record.count >= config.getMaxAttempts()) {
                blocked = true;
                retry = Math.max(retry, Math.max(1,
                    Duration.between(now, record.expiresAt).toSeconds() + 1));
            }
        }
        return new Decision(blocked, retry);
    }

    private List<String> keys(String scope, String clientIp, String principal) {
        String safeScope = scope.replaceAll("[^a-zA-Z0-9_-]", "_");
        String prefix = config.getKeyPrefix() + safeScope + ":";
        return List.of(
            prefix + "ip:" + hmac.hash("rate-ip", nullToEmpty(clientIp)),
            prefix + "principal:" + hmac.hash("rate-principal", nullToEmpty(principal)));
    }

    private static String nullToEmpty(String value) { return value == null ? "" : value; }
    private static boolean invalid(Duration value) {
        return value == null || value.isZero() || value.isNegative();
    }

    record Decision(boolean blocked, long retryAfterSeconds) {}
    private record AttemptRecord(int count, Instant expiresAt) {
        boolean expired(Instant now) { return !now.isBefore(expiresAt); }
    }
}
