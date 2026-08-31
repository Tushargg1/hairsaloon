package com.hairsaloon.tenantdata;

import java.util.List;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface GoogleReviewRepository extends TenantScopedRepository<GoogleReview> {

    GoogleReview save(GoogleReview review);

    List<GoogleReview> findAllBySalonIdOrderBySortOrderAsc(long salonId);

    @Modifying
    @Query("delete from GoogleReview review where review.salonId = :salonId")
    void deleteAllBySalonId(@Param("salonId") long salonId);
}
