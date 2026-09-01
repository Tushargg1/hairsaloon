package com.hairsaloon.tenantdata;

import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SalonPhotoRepository extends TenantScopedRepository<SalonPhoto> {

    SalonPhoto save(SalonPhoto photo);

    List<SalonPhoto> findAllBySalonIdOrderBySortOrderAsc(long salonId);

    @Modifying
    @Query("delete from SalonPhoto photo where photo.salonId = :salonId and photo.source = :source")
    void deleteAllBySalonIdAndSource(@Param("salonId") long salonId, @Param("source") String source);

    @Modifying
    @Query("delete from SalonPhoto photo where photo.salonId = :salonId")
    void deleteAllBySalonId(@Param("salonId") long salonId);
}
