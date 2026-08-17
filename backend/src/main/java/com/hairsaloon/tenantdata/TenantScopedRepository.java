package com.hairsaloon.tenantdata;

import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.repository.Repository;

/**
 * Marker for tenant-owned persistence. It intentionally declares no unscoped
 * findAll/findById operations; each repository read must include salonId.
 */
@NoRepositoryBean
public interface TenantScopedRepository<T> extends Repository<T, Long> {
}
