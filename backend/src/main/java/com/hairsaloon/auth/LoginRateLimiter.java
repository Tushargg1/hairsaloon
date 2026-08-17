package com.hairsaloon.auth;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

/**
 * Simple in-memory rate limiter for login attempts. Blocks an IP after
 * exceeding MAX_ATTEMPTS within WINDOW_SECONDS.
 */
@Component
class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final int WINDOW_SECONDS = 300; // 5 minutes

    private final ConcurrentHashMap<String, AttemptRecord> attempts = new ConcurrentHashMap<>();

    boolean isBlocked(String key) {
        AttemptRecord record = attempts.get(key);
        if (record == null) return false;
        if (record.windowExpired()) {
            attempts.remove(key);
            return false;
        }
        return record.count.get() >= MAX_ATTEMPTS;
    }

    void recordFailure(String key) {
        attempts.compute(key, (k, existing) -> {
            if (existing == null || existing.windowExpired()) {
                return new AttemptRecord();
            }
            existing.count.incrementAndGet();
            return existing;
        });
    }

    void recordSuccess(String key) {
        attempts.remove(key);
    }

    private static class AttemptRecord {
        final AtomicInteger count = new AtomicInteger(1);
        final Instant windowStart = Instant.now();

        boolean windowExpired() {
            return Instant.now().isAfter(windowStart.plusSeconds(WINDOW_SECONDS));
        }
    }
}
