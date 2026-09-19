package com.hairsaloon.auth;

import jakarta.servlet.http.HttpServletRequest;
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
        java.util.Map<String, Integer> buckets = keys(scope, clientIp, normalizedPrincipal);
        if (config.isRedisEnabled()) {
            try {
                long retry = 0;
                boolean blocked = false;
                for (var bucket : buckets.entrySet()) {
                    String countValue = redis.opsForValue().get(bucket.getKey());
                    if (countValue != null && Long.parseLong(countValue) >= bucket.getValue()) {
                        blocked = true;
                        Long ttl = redis.getExpire(bucket.getKey());
                        retry = Math.max(retry, ttl == null ? 1 : Math.max(1, ttl));
                    }
                }
                return new Decision(blocked, retry);
            } catch (RuntimeException unavailable) {
                // Redis is the primary store; an isolated in-process limiter keeps auth available.
            }
        }
        return fallbackCheck(buckets);
    }

    void recordFailure(String scope, String clientIp, String normalizedPrincipal) {
        java.util.Set<String> keys = keys(scope, clientIp, normalizedPrincipal).keySet();
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
        // Do not clear the global bucket on success — otherwise a spray with an
        // occasional valid login would reset the shared counter. Only clear the
        // per-IP and per-principal buckets for this caller.
        List<String> keys = List.copyOf(keys(scope, clientIp, normalizedPrincipal).keySet());
        List<String> clearable = keys.stream().filter(k -> !k.contains(":global:")).toList();
        if (config.isRedisEnabled()) {
            try {
                redis.delete(clearable);
            } catch (RuntimeException unavailable) {
                // Local cleanup below is always safe.
            }
        }
        clearable.forEach(fallback::remove);
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

    private Decision fallbackCheck(java.util.Map<String, Integer> buckets) {
        Instant now = Instant.now();
        long retry = 0;
        boolean blocked = false;
        for (var bucket : buckets.entrySet()) {
            String key = bucket.getKey();
            AttemptRecord record = fallback.get(key);
            if (record != null && record.expired(now)) {
                fallback.remove(key, record);
                record = null;
            }
            if (record != null && record.count >= bucket.getValue()) {
                blocked = true;
                retry = Math.max(retry, Math.max(1,
                    Duration.between(now, record.expiresAt).toSeconds() + 1));
            }
        }
        return new Decision(blocked, retry);
    }

    /**
     * Client address for rate-limit buckets. `forward-headers-strategy: framework`
     * makes {@code getRemoteAddr()} return the first X-Forwarded-For entry, which the
     * caller supplies and can rotate to get a fresh bucket per request. Proxies append,
     * so the last entry is the hop our own edge observed.
     */
    static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] hops = forwarded.split(",");
            String last = hops[hops.length - 1].trim();
            if (!last.isEmpty()) return last;
        }
        return request.getRemoteAddr();
    }

    /** Buckets to enforce for this attempt, mapped to their max-attempt threshold. */
    private java.util.Map<String, Integer> keys(String scope, String clientIp, String principal) {
        String safeScope = scope.replaceAll("[^a-zA-Z0-9_-]", "_");
        String prefix = config.getKeyPrefix() + safeScope + ":";
        java.util.Map<String, Integer> buckets = new java.util.LinkedHashMap<>();
        buckets.put(prefix + "ip:" + hmac.hash("rate-ip", nullToEmpty(clientIp)), config.getMaxAttempts());
        buckets.put(prefix + "principal:" + hmac.hash("rate-principal", nullToEmpty(principal)),
            config.getMaxAttempts());
        // Per-scope global bucket: caps total failures across all IPs/accounts so a host
        // rotating X-Forwarded-For can't spray many accounts. Off when set to 0.
        if (config.getGlobalMaxAttempts() > 0) {
            buckets.put(prefix + "global:all", config.getGlobalMaxAttempts());
        }
        return buckets;
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
