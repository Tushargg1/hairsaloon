package com.hairsaloon.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
class TenantResolverTest {

    @Mock SalonRepository repository;
    @Mock StringRedisTemplate redis;
    @Mock ValueOperations<String, String> values;

    @Test
    void fallsBackToDatabaseWhenRedisIsUnavailable() {
        when(redis.opsForValue()).thenReturn(values);
        when(values.get("tenant:subdomain:glamour"))
            .thenThrow(new RedisConnectionFailureException("offline"));
        when(repository.findIdBySubdomainAndStatus("glamour", SalonStatus.ACTIVE))
            .thenReturn(Optional.of(91L));
        TenantProperties properties = new TenantProperties();

        assertThat(new TenantResolver(repository, redis, properties)
            .resolveActiveSalonId("glamour")).contains(91L);
    }

    @Test
    void cachesDatabaseResolutionForExactlyFiveMinutes() {
        when(redis.opsForValue()).thenReturn(values);
        when(values.get("tenant:subdomain:glamour")).thenReturn(null);
        when(repository.findIdBySubdomainAndStatus("glamour", SalonStatus.ACTIVE))
            .thenReturn(Optional.of(91L));
        TenantProperties properties = new TenantProperties();

        new TenantResolver(repository, redis, properties).resolveActiveSalonId("glamour");

        verify(values).set("tenant:subdomain:glamour", "91", Duration.ofMinutes(5));
    }
}
