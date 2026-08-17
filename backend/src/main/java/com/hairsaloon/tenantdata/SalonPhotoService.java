package com.hairsaloon.tenantdata;

import com.hairsaloon.tenant.TenantContext;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalonPhotoService {

    private final SalonPhotoRepository repository;

    SalonPhotoService(SalonPhotoRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<SalonPhoto> findAllForCurrentTenant() {
        return repository.findAllBySalonIdOrderBySortOrderAsc(TenantContext.requireSalonId());
    }
}
