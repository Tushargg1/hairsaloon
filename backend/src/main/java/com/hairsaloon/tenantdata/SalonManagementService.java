package com.hairsaloon.tenantdata;

import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import com.hairsaloon.tenant.TenantContext;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SalonManagementService {
    private final SalonRepository salons;
    private final SalonServiceRepository services;
    private final SalonStaffRepository staff;
    private final StaffServiceRepository assignments;
    private final StaffWorkingHourRepository hours;
    private final StaffTimeOffRepository timeOff;

    SalonManagementService(SalonRepository salons, SalonServiceRepository services,
                           SalonStaffRepository staff, StaffServiceRepository assignments,
                           StaffWorkingHourRepository hours,
                           StaffTimeOffRepository timeOff) {
        this.salons = salons;
        this.services = services;
        this.staff = staff;
        this.assignments = assignments;
        this.hours = hours;
        this.timeOff = timeOff;
    }

    @Transactional(readOnly = true)
    Salon profile() {
        return currentSalon();
    }

    @Transactional
    Salon updateProfile(String name, String description, String address, String city,
                        String phone, String email, String logoUrl, String timezone,
                        int cancellationWindowMinutes) {
        if (cancellationWindowMinutes < 0 || cancellationWindowMinutes > 525600)
            throw TenantInputPolicy.validation("cancellationWindowMinutes",
                "must be between 0 and 525600");
        Salon salon = currentSalon();
        salon.updateProfile(TenantInputPolicy.text(name, 160, "name", true),
            TenantInputPolicy.text(description, 5000, "description", false),
            TenantInputPolicy.text(address, 500, "address", true),
            TenantInputPolicy.text(city, 120, "city", true),
            TenantInputPolicy.phone(phone), TenantInputPolicy.email(email),
            TenantInputPolicy.url(logoUrl, "logoUrl"), TenantInputPolicy.timezone(timezone),
            cancellationWindowMinutes);
        return salons.save(salon);
    }

    @Transactional(readOnly = true)
    List<SalonServiceEntity> services() {
        return services.findAllBySalonIdOrderByIdAsc(TenantContext.requireSalonId());
    }

    @Transactional
    SalonServiceEntity createService(String name, int durationMinutes, BigDecimal price,
                                     String category) {
        validateService(durationMinutes, price);
        return services.save(new SalonServiceEntity(TenantContext.requireSalonId(),
            TenantInputPolicy.text(name, 160, "name", true), durationMinutes, price,
            TenantInputPolicy.text(category, 120, "category", false)));
    }

    @Transactional
    SalonServiceEntity updateService(long id, String name, int durationMinutes,
                                     BigDecimal price, String category, boolean active) {
        validateService(durationMinutes, price);
        long salonId = TenantContext.requireSalonId();
        String safeName = TenantInputPolicy.text(name, 160, "name", true);
        String safeCategory = TenantInputPolicy.text(category, 120, "category", false);
        if (services.updateByIdAndSalonId(id, salonId, safeName, durationMinutes,
                price, safeCategory, active) == 0)
            throw TenantInputPolicy.notFound("service");
        return services.findByIdAndSalonId(id, salonId).orElseThrow(() ->
            TenantInputPolicy.notFound("service"));
    }

    @Transactional
    void deleteService(long id) {
        long salonId = TenantContext.requireSalonId();
        if (services.deactivateByIdAndSalonId(id, salonId) == 0)
            throw TenantInputPolicy.notFound("service");
    }

    @Transactional(readOnly = true)
    List<StaffDetails> staff() {
        long salonId = TenantContext.requireSalonId();
        return staff.findAllBySalonIdOrderByIdAsc(salonId).stream()
            .map(member -> details(salonId, member)).toList();
    }

    @Transactional
    StaffDetails createStaff(String name, String photoUrl) {
        long salonId = TenantContext.requireSalonId();
        SalonStaff member = staff.save(new SalonStaff(salonId,
            TenantInputPolicy.text(name, 160, "name", true),
            TenantInputPolicy.url(photoUrl, "photoUrl")));
        return details(salonId, member);
    }

    @Transactional
    StaffDetails updateStaff(long id, String name, String photoUrl, boolean active) {
        long salonId = TenantContext.requireSalonId();
        String safeName = TenantInputPolicy.text(name, 160, "name", true);
        String safePhotoUrl = TenantInputPolicy.url(photoUrl, "photoUrl");
        if (staff.updateByIdAndSalonId(id, salonId, safeName, safePhotoUrl, active) == 0)
            throw TenantInputPolicy.notFound("staff");
        SalonStaff member = staff.findByIdAndSalonId(id, salonId).orElseThrow(() ->
            TenantInputPolicy.notFound("staff"));
        return details(salonId, member);
    }

    @Transactional
    void deleteStaff(long id) {
        long salonId = TenantContext.requireSalonId();
        if (staff.deactivateByIdAndSalonId(id, salonId) == 0)
            throw TenantInputPolicy.notFound("staff");
    }

    @Transactional
    StaffDetails replaceAssignments(long staffId, List<Long> requestedIds) {
        long salonId = TenantContext.requireSalonId();
        SalonStaff member = requireStaff(staffId);
        List<Long> ids = requestedIds == null ? List.of() : List.copyOf(requestedIds);
        if (ids.stream().anyMatch(id -> id == null || id <= 0)
                || new HashSet<>(ids).size() != ids.size())
            throw TenantInputPolicy.validation("serviceIds",
                "must contain unique positive service IDs");
        if (!ids.isEmpty()) {
            List<SalonServiceEntity> valid = services.findAllByIdInAndSalonIdAndActiveTrue(
                ids, salonId);
            if (valid.size() != ids.size())
                throw TenantInputPolicy.validation("serviceIds",
                    "must reference active services in the current salon");
        }
        assignments.deleteAllBySalonIdAndStaffId(salonId, staffId);
        assignments.saveAll(ids.stream()
            .map(serviceId -> new StaffService(salonId, staffId, serviceId)).toList());
        return details(salonId, member);
    }

    @Transactional
    List<StaffWorkingHour> replaceHours(long staffId, List<HourInput> inputs) {
        long salonId = TenantContext.requireSalonId();
        requireStaff(staffId);
        List<HourInput> values = inputs == null ? List.of() : List.copyOf(inputs);
        validateHours(values);
        hours.deleteAllBySalonIdAndStaffId(salonId, staffId);
        return hours.saveAll(values.stream()
            .sorted(Comparator.comparingInt(HourInput::dayOfWeek)
                .thenComparing(HourInput::startTime))
            .map(value -> new StaffWorkingHour(salonId, staffId, value.dayOfWeek(),
                value.startTime(), value.endTime())).toList());
    }

    @Transactional(readOnly = true)
    List<StaffTimeOff> timeOff(long staffId) {
        long salonId = TenantContext.requireSalonId();
        requireStaff(staffId);
        return timeOff.findAllBySalonIdAndStaffIdOrderByStartDateTimeAsc(salonId, staffId);
    }

    @Transactional
    StaffTimeOff createTimeOff(long staffId, LocalDateTime start, LocalDateTime end,
                               String reason) {
        long salonId = TenantContext.requireSalonId();
        requireStaff(staffId);
        if (start == null || end == null || !start.isBefore(end))
            throw TenantInputPolicy.validation("timeOff",
                "startDateTime must be before endDateTime");
        if (timeOff.countOverlapping(salonId, staffId, start, end) > 0)
            throw TenantInputPolicy.conflict("TIME_OFF_OVERLAP",
                "Time off overlaps an existing entry");
        return timeOff.save(new StaffTimeOff(salonId, staffId, start, end,
            TenantInputPolicy.text(reason, 255, "reason", false)));
    }

    @Transactional
    void deleteTimeOff(long staffId, long timeOffId) {
        long salonId = TenantContext.requireSalonId();
        requireStaff(staffId);
        timeOff.findByIdAndSalonIdAndStaffId(timeOffId, salonId, staffId)
            .orElseThrow(() -> TenantInputPolicy.notFound("time_off"));
        timeOff.deleteByIdAndSalonIdAndStaffId(timeOffId, salonId, staffId);
    }

    private Salon currentSalon() {
        long salonId = TenantContext.requireSalonId();
        return salons.findById(salonId).orElseThrow(() -> TenantInputPolicy.notFound("salon"));
    }

    private SalonServiceEntity requireService(long id) {
        long salonId = TenantContext.requireSalonId();
        return services.findByIdAndSalonId(id, salonId).orElseThrow(() ->
            TenantInputPolicy.notFound("service"));
    }

    private SalonStaff requireStaff(long id) {
        long salonId = TenantContext.requireSalonId();
        return staff.findByIdAndSalonId(id, salonId).orElseThrow(() ->
            TenantInputPolicy.notFound("staff"));
    }

    private StaffDetails details(long salonId, SalonStaff member) {
        return new StaffDetails(member, assignments.findServiceIds(salonId, member.getId()),
            hours.findAllBySalonIdAndStaffIdOrderByDayOfWeekAscStartTimeAsc(
                salonId, member.getId()));
    }

    private static void validateService(int duration, BigDecimal price) {
        if (duration < 15 || duration > 180)
            throw TenantInputPolicy.validation("durationMinutes", "must be between 15 and 180");
        if (price == null || price.signum() < 0
                || price.compareTo(new BigDecimal("9999999999.99")) > 0)
            throw TenantInputPolicy.validation("price",
                "must be non-negative and fit the supported price range");
    }

    private static void validateHours(List<HourInput> values) {
        if (values.stream().anyMatch(java.util.Objects::isNull))
            throw TenantInputPolicy.validation("workingHours", "intervals must not be null");
        List<HourInput> sorted = new ArrayList<>(values);
        sorted.sort(Comparator.comparingInt(HourInput::dayOfWeek)
            .thenComparing(HourInput::startTime,
                Comparator.nullsFirst(Comparator.naturalOrder())));
        HourInput previous = null;
        for (HourInput value : sorted) {
            if (value == null || value.dayOfWeek() < 0 || value.dayOfWeek() > 6
                    || value.startTime() == null || value.endTime() == null
                    || !value.startTime().isBefore(value.endTime()))
                throw TenantInputPolicy.validation("workingHours",
                    "each interval needs day 0-6 and startTime before endTime");
            if (previous != null && previous.dayOfWeek() == value.dayOfWeek()
                    && value.startTime().isBefore(previous.endTime()))
                throw TenantInputPolicy.validation("workingHours",
                    "intervals on the same day must not overlap");
            previous = value;
        }
    }

    record HourInput(int dayOfWeek, LocalTime startTime, LocalTime endTime) {}
    record StaffDetails(SalonStaff staff, List<Long> serviceIds,
                        List<StaffWorkingHour> workingHours) {}
}
