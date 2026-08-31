package com.hairsaloon.tenant;

import java.util.Optional;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class TenantResolver {

    private static final String CACHE_PREFIX = "tenant:subdomain:";

    private final SalonRepository salonRepository;
    private final StringRedisTemplate redisTemplate;
    private final TenantProperties properties;

    TenantResolver(SalonRepository salonRepository, StringRedisTemplate redisTemplate,
                   TenantProperties properties) {
        this.salonRepository = salonRepository;
        this.redisTemplate = redisTemplate;
        this.properties = properties;
    }

    public boolean exists(String subdomain) {
        return salonRepository.existsBySubdomain(subdomain);
    }

    /** Called when an administrator changes a salon's status, so the change is immediate. */
    public void evict(String subdomain) {
        try {
            redisTemplate.delete(CACHE_PREFIX + subdomain);
        } catch (RuntimeException redisUnavailable) {
            // Without a cache entry the next request reads the database anyway.
        }
    }

    public Optional<Long> resolveActiveSalonId(String subdomain) {
        String key = CACHE_PREFIX + subdomain;
        Optional<Long> cached = readCacheSafely(key);
        if (cached.isPresent()) {
            return cached;
        }

        Optional<Long> salonId = salonRepository.findIdBySubdomainAndStatus(
            subdomain, SalonStatus.ACTIVE);
        salonId.ifPresent(id -> writeCacheSafely(key, id));
        return salonId;
    }

    private Optional<Long> readCacheSafely(String key) {
        try {
            String value = redisTemplate.opsForValue().get(key);
            return value == null ? Optional.empty() : Optional.of(Long.parseLong(value));
        } catch (RuntimeException unavailableOrInvalidCacheEntry) {
            return Optional.empty();
        }
    }

    private void writeCacheSafely(String key, long salonId) {
        try {
            redisTemplate.opsForValue().set(key, Long.toString(salonId),
                properties.getTenantCacheTtl());
        } catch (RuntimeException redisUnavailable) {
            // Tenant resolution remains available through the database.
        }
    }
}
