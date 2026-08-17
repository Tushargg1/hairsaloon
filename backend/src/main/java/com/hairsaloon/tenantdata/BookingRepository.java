package com.hairsaloon.tenantdata;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface BookingRepository extends TenantScopedRepository<Booking> {
    Optional<Booking> findByIdAndSalonId(long id, long salonId);
    Optional<Booking> findByIdAndSalonIdAndCustomerId(long id, long salonId, long customerId);
    Optional<Booking> findBySalonIdAndCustomerIdAndIdempotencyKey(
        long salonId, long customerId, String idempotencyKey);
    List<Booking> findAllBySalonIdAndCustomerIdOrderByStartDateTimeDescIdDesc(
        long salonId, long customerId);

    @Query("select booking from Booking booking where booking.salonId = :salonId "
        + "and booking.startDateTime >= :start and booking.startDateTime < :end "
        + "and (:staffId is null or booking.staffId = :staffId) "
        + "order by booking.startDateTime, booking.id")
    List<Booking> findDashboardBookings(@Param("salonId") long salonId,
        @Param("start") LocalDateTime start, @Param("end") LocalDateTime end,
        @Param("staffId") Long staffId);

    @Query("select count(booking), "
        + "coalesce(sum(case when booking.status = 'COMPLETED' then 1 else 0 end), 0), "
        + "coalesce(sum(case when booking.status = 'CONFIRMED' then 1 else 0 end), 0), "
        + "coalesce(sum(case when booking.status = 'CANCELLED' then 1 else 0 end), 0), "
        + "coalesce(sum(case when booking.status = 'NO_SHOW' then 1 else 0 end), 0), "
        + "coalesce(sum(case when booking.status = 'COMPLETED' "
        + "then booking.priceSnapshot else 0 end), 0) "
        + "from Booking booking where booking.salonId = :salonId "
        + "and booking.startDateTime >= :start and booking.startDateTime < :end")
    List<Object[]> summarizeDashboardWeek(@Param("salonId") long salonId,
        @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("select count(booking) from Booking booking where booking.salonId = :salonId "
        + "and booking.staffId = :staffId and booking.status = 'CONFIRMED' "
        + "and booking.startDateTime < :end and booking.endDateTime > :start")
    long countConfirmedOverlapping(@Param("salonId") long salonId,
        @Param("staffId") long staffId, @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end);

    @Query("select count(booking) from Booking booking where booking.salonId = :salonId "
        + "and booking.staffId = :staffId and booking.status = 'CONFIRMED' "
        + "and booking.startDateTime < :end and booking.endDateTime > :start "
        + "and (:excludedBookingId is null or booking.id <> :excludedBookingId)")
    long countConfirmedOverlappingExcluding(@Param("salonId") long salonId,
        @Param("staffId") long staffId, @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("excludedBookingId") Long excludedBookingId);

    Booking saveAndFlush(Booking booking);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Booking booking set booking.startDateTime = :start, "
        + "booking.endDateTime = :end where booking.id = :id "
        + "and booking.salonId = :salonId and booking.status = 'CONFIRMED'")
    int rescheduleConfirmed(@Param("id") long id, @Param("salonId") long salonId,
        @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Booking booking set booking.status = 'CANCELLED', "
        + "booking.cancelledAt = :cancelledAt where booking.id = :id "
        + "and booking.salonId = :salonId and booking.status = 'CONFIRMED'")
    int cancelConfirmed(@Param("id") long id, @Param("salonId") long salonId,
        @Param("cancelledAt") Instant cancelledAt);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Booking booking set booking.status = :status where booking.id = :id "
        + "and booking.salonId = :salonId and booking.status = 'CONFIRMED'")
    int transitionConfirmed(@Param("id") long id, @Param("salonId") long salonId,
        @Param("status") BookingStatus status);
}
