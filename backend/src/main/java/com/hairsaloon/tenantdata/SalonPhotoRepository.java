package com.hairsaloon.tenantdata;

import java.util.List;

interface SalonPhotoRepository extends TenantScopedRepository<SalonPhoto> {

    List<SalonPhoto> findAllBySalonIdOrderBySortOrderAsc(long salonId);
}
