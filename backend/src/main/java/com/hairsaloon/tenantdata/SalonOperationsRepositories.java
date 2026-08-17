package com.hairsaloon.tenantdata;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface SalonServiceRepository extends TenantScopedRepository<SalonServiceEntity> {
    List<SalonServiceEntity> findAllBySalonIdOrderByIdAsc(long salonId);
    List<SalonServiceEntity> findAllBySalonIdAndActiveTrueOrderByIdAsc(long salonId);
    Optional<SalonServiceEntity> findByIdAndSalonId(long id, long salonId);
    List<SalonServiceEntity> findAllByIdInAndSalonIdAndActiveTrue(
        List<Long> ids, long salonId);
    SalonServiceEntity save(SalonServiceEntity entity);
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update SalonServiceEntity service set service.name = :name, "
        + "service.durationMinutes = :duration, service.price = :price, "
        + "service.category = :category, service.active = :active "
        + "where service.id = :id and service.salonId = :salonId")
    int updateByIdAndSalonId(@Param("id") long id, @Param("salonId") long salonId,
        @Param("name") String name, @Param("duration") int duration,
        @Param("price") java.math.BigDecimal price, @Param("category") String category,
        @Param("active") boolean active);
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update SalonServiceEntity service set service.active = false "
        + "where service.id = :id and service.salonId = :salonId")
    int deactivateByIdAndSalonId(@Param("id") long id, @Param("salonId") long salonId);
}

interface SalonStaffRepository extends TenantScopedRepository<SalonStaff> {
    List<SalonStaff> findAllBySalonIdOrderByIdAsc(long salonId);
    List<SalonStaff> findAllBySalonIdAndActiveTrueOrderByIdAsc(long salonId);
    Optional<SalonStaff> findByIdAndSalonId(long id, long salonId);
    SalonStaff save(SalonStaff entity);
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update SalonStaff staff set staff.name = :name, staff.photoUrl = :photoUrl, "
        + "staff.active = :active where staff.id = :id and staff.salonId = :salonId")
    int updateByIdAndSalonId(@Param("id") long id, @Param("salonId") long salonId,
        @Param("name") String name, @Param("photoUrl") String photoUrl,
        @Param("active") boolean active);
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update SalonStaff staff set staff.active = false "
        + "where staff.id = :id and staff.salonId = :salonId")
    int deactivateByIdAndSalonId(@Param("id") long id, @Param("salonId") long salonId);
}

interface StaffServiceRepository extends TenantScopedRepository<StaffService> {
    @Query("select assignment.serviceId from StaffService assignment "
        + "where assignment.salonId = :salonId and assignment.staffId = :staffId "
        + "order by assignment.serviceId")
    List<Long> findServiceIds(@Param("salonId") long salonId,
                              @Param("staffId") long staffId);

    @Query("select assignment.serviceId from StaffService assignment, "
        + "SalonServiceEntity service where assignment.salonId = :salonId "
        + "and assignment.staffId = :staffId and service.salonId = :salonId "
        + "and service.id = assignment.serviceId and service.active = true "
        + "order by assignment.serviceId")
    List<Long> findActiveServiceIds(@Param("salonId") long salonId,
                                    @Param("staffId") long staffId);
    boolean existsBySalonIdAndStaffIdAndServiceId(long salonId, long staffId, long serviceId);
    @Modifying
    void deleteAllBySalonIdAndStaffId(long salonId, long staffId);
    <S extends StaffService> List<S> saveAll(Iterable<S> entities);
}

interface StaffWorkingHourRepository extends TenantScopedRepository<StaffWorkingHour> {
    List<StaffWorkingHour> findAllBySalonIdAndStaffIdOrderByDayOfWeekAscStartTimeAsc(
        long salonId, long staffId);
    @Modifying
    void deleteAllBySalonIdAndStaffId(long salonId, long staffId);
    <S extends StaffWorkingHour> List<S> saveAll(Iterable<S> entities);
}

interface StaffTimeOffRepository extends TenantScopedRepository<StaffTimeOff> {
    List<StaffTimeOff> findAllBySalonIdAndStaffIdOrderByStartDateTimeAsc(
        long salonId, long staffId);
    Optional<StaffTimeOff> findByIdAndSalonIdAndStaffId(long id, long salonId, long staffId);
    @Query("select count(timeOff) from StaffTimeOff timeOff where timeOff.salonId = :salonId "
        + "and timeOff.staffId = :staffId and timeOff.startDateTime < :end "
        + "and timeOff.endDateTime > :start")
    long countOverlapping(@Param("salonId") long salonId, @Param("staffId") long staffId,
                          @Param("start") LocalDateTime start,
                          @Param("end") LocalDateTime end);
    StaffTimeOff save(StaffTimeOff entity);
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    void deleteByIdAndSalonIdAndStaffId(long id, long salonId, long staffId);
}
