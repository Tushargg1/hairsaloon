package com.hairsaloon.tenantdata;

import com.hairsaloon.platform.InputPolicy;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import com.hairsaloon.tenant.TenantContext;
import com.hairsaloon.tenant.TenantResolver;
import java.util.Locale;
import java.util.regex.Pattern;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SalonManagementService {
    /** Kept short so the price board renders each entry on one line. */
    static final int SERVICE_NAME_MAX = 36;
    static final int CATEGORY_MAX = 20;

    private static final Pattern SUBDOMAIN = Pattern.compile("[a-z0-9][a-z0-9-]{1,28}[a-z0-9]");

    private final SalonRepository salons;
    private final SalonServiceRepository services;
    private final SalonStaffRepository staff;
    private final StaffServiceRepository assignments;
    private final StaffWorkingHourRepository hours;
    private final StaffTimeOffRepository timeOff;
    private final TenantResolver tenantResolver;

    SalonManagementService(SalonRepository salons, SalonServiceRepository services,
                           SalonStaffRepository staff, StaffServiceRepository assignments,
                           StaffWorkingHourRepository hours,
                           StaffTimeOffRepository timeOff, TenantResolver tenantResolver) {
        this.salons = salons;
        this.services = services;
        this.staff = staff;
        this.assignments = assignments;
        this.hours = hours;
        this.timeOff = timeOff;
        this.tenantResolver = tenantResolver;
    }

    @Transactional(readOnly = true)
    Salon profile() {
        return currentSalon();
    }

    @Transactional
    Salon updateProfile(String name, String description, String address, String city,
                        String phone, String email, String logoUrl, String timezone,
                        int cancellationWindowMinutes, String subdomain, SocialLinks socials) {
        if (cancellationWindowMinutes < 0 || cancellationWindowMinutes > 525600)
            throw InputPolicy.validation("cancellationWindowMinutes",
                "must be between 0 and 525600");
        Salon salon = currentSalon();
        String oldSubdomain = salon.getSubdomain();
        applySubdomain(salon, subdomain);
        salon.updateProfile(InputPolicy.text(name, 160, "name", true),
            InputPolicy.text(description, 5000, "description", false),
            InputPolicy.text(address, 500, "address", true),
            InputPolicy.text(city, 120, "city", true),
            InputPolicy.phone(phone), InputPolicy.email(email),
            InputPolicy.url(logoUrl, "logoUrl"), InputPolicy.timezone(timezone),
            cancellationWindowMinutes);
        SocialLinks links = socials == null
            ? new SocialLinks(null, null, null, null, null) : socials;
        salon.updateSocialLinks(InputPolicy.url(links.instagramUrl(), "instagramUrl"),
            InputPolicy.url(links.facebookUrl(), "facebookUrl"),
            InputPolicy.url(links.whatsappUrl(), "whatsappUrl"),
            InputPolicy.url(links.youtubeUrl(), "youtubeUrl"),
            InputPolicy.url(links.mapsUrl(), "mapsUrl"));
        Salon saved = salons.save(salon);
        if (!oldSubdomain.equals(saved.getSubdomain())) {
            tenantResolver.evict(oldSubdomain);
            tenantResolver.evict(saved.getSubdomain());
        }
        return saved;
    }

    /** Validates and applies a new site subdomain; no-op when unchanged. */
    private void applySubdomain(Salon salon, String requested) {
        if (requested == null || requested.isBlank()) return;
        String slug = requested.trim().toLowerCase(Locale.ROOT);
        if (slug.equals(salon.getSubdomain())) return;
        if (!SUBDOMAIN.matcher(slug).matches())
            throw InputPolicy.validation("subdomain",
                "must be 3-30 lowercase letters, numbers or hyphens");
        if (salons.existsBySubdomain(slug))
            throw InputPolicy.conflict("SUBDOMAIN_TAKEN", "That URL is already in use");
        salon.rename(null, slug);
    }

    @Transactional
    Salon updateCategoryOrder(List<String> categories) {
        List<String> cleaned = (categories == null ? List.<String>of() : categories).stream()
            .map(value -> InputPolicy.text(value, CATEGORY_MAX, "categories", false))
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (cleaned.size() > 100)
            throw InputPolicy.validation("categories", "must not exceed 100 entries");
        Salon salon = currentSalon();
        salon.updateCategoryOrder(cleaned);
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
            InputPolicy.text(name, SERVICE_NAME_MAX, "name", true), durationMinutes, price,
            InputPolicy.text(category, CATEGORY_MAX, "category", false)));
    }

    @Transactional
    SalonServiceEntity updateService(long id, String name, int durationMinutes,
                                     BigDecimal price, String category, boolean active) {
        validateService(durationMinutes, price);
        long salonId = TenantContext.requireSalonId();
        String safeName = InputPolicy.text(name, SERVICE_NAME_MAX, "name", true);
        String safeCategory = InputPolicy.text(category, CATEGORY_MAX, "category", false);
        if (services.updateByIdAndSalonId(id, salonId, safeName, durationMinutes,
                price, safeCategory, active) == 0)
            throw InputPolicy.notFound("service");
        return services.findByIdAndSalonId(id, salonId).orElseThrow(() ->
            InputPolicy.notFound("service"));
    }

    @Transactional
    void deleteService(long id) {
        long salonId = TenantContext.requireSalonId();
        if (services.deactivateByIdAndSalonId(id, salonId) == 0)
            throw InputPolicy.notFound("service");
    }

    @Transactional(readOnly = true)
    List<StaffDetails> staff() {
        long salonId = TenantContext.requireSalonId();
        return staff.findAllBySalonIdOrderByIdAsc(salonId).stream()
            .map(member -> details(salonId, member)).toList();
    }

    @Transactional
    StaffDetails createStaff(String name, String photoUrl, String characterKey) {
        long salonId = TenantContext.requireSalonId();
        SalonStaff member = staff.save(new SalonStaff(salonId,
            InputPolicy.text(name, 160, "name", true),
            InputPolicy.url(photoUrl, "photoUrl"),
            InputPolicy.text(characterKey, 40, "characterKey", false)));
        return details(salonId, member);
    }

    @Transactional
    StaffDetails updateStaff(long id, String name, String photoUrl, String characterKey,
                             boolean active) {
        long salonId = TenantContext.requireSalonId();
        String safeName = InputPolicy.text(name, 160, "name", true);
        String safePhotoUrl = InputPolicy.url(photoUrl, "photoUrl");
        String safeCharacter = InputPolicy.text(characterKey, 40, "characterKey", false);
        if (staff.updateByIdAndSalonId(id, salonId, safeName, safePhotoUrl, safeCharacter,
                active) == 0)
            throw InputPolicy.notFound("staff");
        SalonStaff member = staff.findByIdAndSalonId(id, salonId).orElseThrow(() ->
            InputPolicy.notFound("staff"));
        return details(salonId, member);
    }

    @Transactional
    void deleteStaff(long id) {
        long salonId = TenantContext.requireSalonId();
        if (staff.deactivateByIdAndSalonId(id, salonId) == 0)
            throw InputPolicy.notFound("staff");
    }

    @Transactional
    StaffDetails replaceAssignments(long staffId, List<Long> requestedIds) {
        long salonId = TenantContext.requireSalonId();
        SalonStaff member = requireStaff(staffId);
        List<Long> ids = requestedIds == null ? List.of() : List.copyOf(requestedIds);
        if (ids.stream().anyMatch(id -> id == null || id <= 0)
                || new HashSet<>(ids).size() != ids.size())
            throw InputPolicy.validation("serviceIds",
                "must contain unique positive service IDs");
        if (!ids.isEmpty()) {
            List<SalonServiceEntity> valid = services.findAllByIdInAndSalonIdAndActiveTrue(
                ids, salonId);
            if (valid.size() != ids.size())
                throw InputPolicy.validation("serviceIds",
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
        // Hibernate would otherwise order the inserts before the delete and trip
        // staff_working_hours_unique when a start time is reused.
        hours.flush();
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
            throw InputPolicy.validation("timeOff",
                "startDateTime must be before endDateTime");
        if (timeOff.countOverlapping(salonId, staffId, start, end) > 0)
            throw InputPolicy.conflict("TIME_OFF_OVERLAP",
                "Time off overlaps an existing entry");
        return timeOff.save(new StaffTimeOff(salonId, staffId, start, end,
            InputPolicy.text(reason, 255, "reason", false)));
    }

    @Transactional
    void deleteTimeOff(long staffId, long timeOffId) {
        long salonId = TenantContext.requireSalonId();
        requireStaff(staffId);
        timeOff.findByIdAndSalonIdAndStaffId(timeOffId, salonId, staffId)
            .orElseThrow(() -> InputPolicy.notFound("time_off"));
        timeOff.deleteByIdAndSalonIdAndStaffId(timeOffId, salonId, staffId);
    }

    private Salon currentSalon() {
        long salonId = TenantContext.requireSalonId();
        return salons.findById(salonId).orElseThrow(() -> InputPolicy.notFound("salon"));
    }

    private SalonStaff requireStaff(long id) {
        long salonId = TenantContext.requireSalonId();
        return staff.findByIdAndSalonId(id, salonId).orElseThrow(() ->
            InputPolicy.notFound("staff"));
    }

    private StaffDetails details(long salonId, SalonStaff member) {
        return new StaffDetails(member, assignments.findServiceIds(salonId, member.getId()),
            hours.findAllBySalonIdAndStaffIdOrderByDayOfWeekAscStartTimeAsc(
                salonId, member.getId()));
    }

    private static void validateService(int duration, BigDecimal price) {
        if (duration < 15 || duration > 180)
            throw InputPolicy.validation("durationMinutes", "must be between 15 and 180");
        if (price == null || price.signum() < 0
                || price.compareTo(new BigDecimal("9999999999.99")) > 0)
            throw InputPolicy.validation("price",
                "must be non-negative and fit the supported price range");
    }

    private static void validateHours(List<HourInput> values) {
        if (values.stream().anyMatch(java.util.Objects::isNull))
            throw InputPolicy.validation("workingHours", "intervals must not be null");
        List<HourInput> sorted = new ArrayList<>(values);
        sorted.sort(Comparator.comparingInt(HourInput::dayOfWeek)
            .thenComparing(HourInput::startTime,
                Comparator.nullsFirst(Comparator.naturalOrder())));
        HourInput previous = null;
        for (HourInput value : sorted) {
            if (value == null || value.dayOfWeek() < 0 || value.dayOfWeek() > 6
                    || value.startTime() == null || value.endTime() == null
                    || !value.startTime().isBefore(value.endTime()))
                throw InputPolicy.validation("workingHours",
                    "each interval needs day 0-6 and startTime before endTime");
            if (previous != null && previous.dayOfWeek() == value.dayOfWeek()
                    && value.startTime().isBefore(previous.endTime()))
                throw InputPolicy.validation("workingHours",
                    "intervals on the same day must not overlap");
            previous = value;
        }
    }

    record SocialLinks(String instagramUrl, String facebookUrl, String whatsappUrl,
                       String youtubeUrl, String mapsUrl) {}
    record HourInput(int dayOfWeek, LocalTime startTime, LocalTime endTime) {}
    record StaffDetails(SalonStaff staff, List<Long> serviceIds,
                        List<StaffWorkingHour> workingHours) {}
}
