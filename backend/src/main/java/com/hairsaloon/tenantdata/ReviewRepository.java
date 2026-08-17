package com.hairsaloon.tenantdata;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface ReviewRepository extends TenantScopedRepository<Review> {
    boolean existsBySalonIdAndBookingIdAndCustomerId(
        long salonId, long bookingId, long customerId);

    @Query("select review from Review review where review.salonId = :salonId "
        + "order by review.createdAt desc, review.id desc")
    Page<Review> findPublicPage(@Param("salonId") long salonId, Pageable pageable);

    @Query("select count(review), coalesce(avg(review.rating), 0), "
        + "coalesce(sum(case when review.rating = 1 then 1 else 0 end), 0), "
        + "coalesce(sum(case when review.rating = 2 then 1 else 0 end), 0), "
        + "coalesce(sum(case when review.rating = 3 then 1 else 0 end), 0), "
        + "coalesce(sum(case when review.rating = 4 then 1 else 0 end), 0), "
        + "coalesce(sum(case when review.rating = 5 then 1 else 0 end), 0) "
        + "from Review review where review.salonId = :salonId")
    List<Object[]> summarize(@Param("salonId") long salonId);

    Review saveAndFlush(Review review);
}
