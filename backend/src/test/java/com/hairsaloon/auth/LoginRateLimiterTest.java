package com.hairsaloon.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;

class LoginRateLimiterTest {
    @Test
    void fallsBackWhenRedisUnavailableAndLimitsIpAndHashedPrincipal() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        when(redis.opsForValue()).thenThrow(new RedisConnectionFailureException("offline"));
        AuthProperties properties = new AuthProperties();
        properties.getJwt().setSecret(
            "raw:0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-extra-secret");
        properties.getRateLimit().setMaxAttempts(2);
        LoginRateLimiter limiter = new LoginRateLimiter(redis,
            new AuthHmacService(properties), properties);

        limiter.recordFailure("login", "203.0.113.1", "customer@example.com");
        limiter.recordFailure("login", "203.0.113.2", "customer@example.com");
        assertThat(limiter.check("login", "203.0.113.3", "customer@example.com").blocked())
            .isTrue();

        limiter.clear();
        limiter.recordFailure("login", "203.0.113.4", "first@example.com");
        limiter.recordFailure("login", "203.0.113.4", "second@example.com");
        LoginRateLimiter.Decision ipDecision =
            limiter.check("login", "203.0.113.4", "third@example.com");
        assertThat(ipDecision.blocked()).isTrue();
        assertThat(ipDecision.retryAfterSeconds()).isPositive();
    }
}
