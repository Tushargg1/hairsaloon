package com.hairsaloon.tenantdata;

import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.auth.UserRole;
import com.hairsaloon.platform.PlatformApiException;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import com.hairsaloon.tenant.TenantContext;
import java.sql.SQLException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
class BookingService {
    static final String SLOT_MESSAGE =
        "This slot was just booked. Please choose another time.";

    private final SalonRepository salons;
    private final SalonServiceRepository services;
    private final SalonStaffRepository staff;
    private final StaffServiceRepository assignments;
    private final StaffWorkingHourRepository hours;
    private final StaffTimeOffRepository timeOff;
    private final BookingRepository bookings;
    private final ReviewRepository reviews;
    private final PromotionService promotions;
    private final BookingNotificationService notifications;
    private final TransactionTemplate transactions;

    BookingService(SalonRepository salons, SalonServiceRepository services,
                   SalonStaffRepository staff, StaffServiceRepository assignments,
                   StaffWorkingHourRepository hours, StaffTimeOffRepository timeOff,
                   BookingRepository bookings, ReviewRepository reviews,
                   PromotionService promotions,
                   BookingNotificationService notifications,
                   PlatformTransactionManager transactionManager) {
        this.salons = salons;
        this.services = services;
        this.staff = staff;
        this.assignments = assignments;
        this.hours = hours;
        this.timeOff = timeOff;
        this.bookings = bookings;
        this.reviews = reviews;
        this.promotions = promotions;
        this.notifications = notifications;
        this.transactions = new TransactionTemplate(transactionManager);
    }
    @Transactional(readOnly = true)
    List<BookingDtos.AvailabilitySlot> availability(long serviceId, Long staffId,
                                                     LocalDate date) {
        if (serviceId <= 0) throw TenantInputPolicy.validation("serviceId", "must be positive");
        if (date == null) throw TenantInputPolicy.validation("date", "is required");
        long salonId = TenantContext.requireSalonId();
        Salon salon = currentSalon(salonId);
        SalonServiceEntity requestedService = services.findByIdAndSalonId(serviceId, salonId)
            .filter(SalonServiceEntity::isActive)
            .orElseThrow(() -> TenantInputPolicy.notFound("service"));
        List<SalonStaff> candidates;
        if (staffId == null) {
            candidates = staff.findAllBySalonIdAndActiveTrueOrderByIdAsc(salonId).stream()
                .filter(member -> assignments.existsBySalonIdAndStaffIdAndServiceId(
                    salonId, member.getId(), serviceId)).toList();
        } else {
            candidates = staff.findByIdAndSalonId(staffId, salonId)
                .filter(SalonStaff::isActive)
                .filter(member -> assignments.existsBySalonIdAndStaffIdAndServiceId(
                    salonId, member.getId(), serviceId)).stream().toList();
        }
        ZoneId zone = ZoneId.of(salon.getTimezone());
        ZonedDateTime now = ZonedDateTime.now(zone);
        int day = dayNumber(date.getDayOfWeek());
        List<BookingDtos.AvailabilitySlot> result = new ArrayList<>();
        for (SalonStaff member : candidates) {
            for (StaffWorkingHour working : hours
                    .findAllBySalonIdAndStaffIdOrderByDayOfWeekAscStartTimeAsc(
                        salonId, member.getId())) {
                if (working.getDayOfWeek() != day) continue;
                LocalDateTime cursor = LocalDateTime.of(date,
                    ceilQuarterHour(working.getStartTime()));
                LocalDateTime closing = LocalDateTime.of(date, working.getEndTime());
                while (!cursor.plusMinutes(requestedService.getDurationMinutes())
                        .isAfter(closing)) {
                    LocalDateTime end = cursor.plusMinutes(requestedService.getDurationMinutes());
                    if (isFutureValidLocalTime(cursor, zone, now)
                            && timeOff.countOverlapping(salonId, member.getId(), cursor, end) == 0
                            && bookings.countConfirmedOverlapping(
                                salonId, member.getId(), cursor, end) == 0) {
                        result.add(new BookingDtos.AvailabilitySlot(member.getId(),
                            member.getName(), cursor, end));
                    }
                    cursor = cursor.plusMinutes(15);
                }
            }
        }
        result.sort(Comparator.comparing(BookingDtos.AvailabilitySlot::startDatetime)
            .thenComparing(BookingDtos.AvailabilitySlot::staffId));
        return result.stream().distinct().toList();
    }
    Booking create(AuthenticatedUser user, long staffId, long serviceId,
                   LocalDateTime start, String idempotencyKey, String promoCode) {
        requireCustomer(user);
        String key = normalizeKey(idempotencyKey);
        long salonId = TenantContext.requireSalonId();
        try {
            return transactions.execute(status -> {
                if (key != null) {
                    var prior = bookings.findBySalonIdAndCustomerIdAndIdempotencyKey(
                        salonId, user.id(), key);
                    if (prior.isPresent()) return prior.get();
                }
                ValidatedSlot slot = validateSlot(salonId, staffId, serviceId, start, null);
                PromotionService.Quote quote = promotions.quoteForBooking(
                    salonId, user.id(), promoCode, slot.service());
                Booking booking = bookings.saveAndFlush(new Booking(salonId, user.id(), staffId,
                    serviceId, start, slot.end(), quote.originalPrice(), quote.discountAmount(),
                    quote.finalPrice(), quote.promoCode(), slot.service().getName(), key,
                    BookingSource.ONLINE, null, null));
                promotions.reserve(salonId, user.id(), booking.getId(), quote);
                notifications.confirmed(salonId, booking);
                return booking;
            });
        } catch (DataIntegrityViolationException exception) {
            if (key != null) {
                var prior = bookings.findBySalonIdAndCustomerIdAndIdempotencyKey(
                    salonId, user.id(), key);
                if (prior.isPresent()) return prior.get();
            }
            if (isOverlap(exception)) throw slotUnavailable();
            throw exception;
        }
    }

    Booking createWalkIn(long staffId, long serviceId, LocalDateTime start,
                         String guestName, String guestPhone) {
        long salonId = TenantContext.requireSalonId();
        String name = TenantInputPolicy.text(guestName, 160, "guestName", true);
        String phone = TenantInputPolicy.phone(guestPhone);
        if (phone == null) throw TenantInputPolicy.validation("guestPhone", "is required");
        try {
            return transactions.execute(status -> {
                ValidatedSlot slot = validateSlot(salonId, staffId, serviceId, start, null);
                var quote = PromotionService.Quote.none(slot.service().getPrice());
                return bookings.saveAndFlush(new Booking(salonId, null, staffId, serviceId,
                    start, slot.end(), quote.originalPrice(), quote.discountAmount(),
                    quote.finalPrice(), null, slot.service().getName(), null,
                    BookingSource.WALK_IN, name, phone));
            });
        } catch (DataIntegrityViolationException exception) {
            if (isOverlap(exception)) throw slotUnavailable();
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    List<Booking> customerBookings(AuthenticatedUser user) {
        requireCustomer(user);
        return bookings.findAllBySalonIdAndCustomerIdOrderByStartDateTimeDescIdDesc(
            TenantContext.requireSalonId(), user.id());
    }

    @Transactional
    Booking cancelCustomer(AuthenticatedUser user, long bookingId) {
        requireCustomer(user);
        long salonId = TenantContext.requireSalonId();
        Booking booking = bookings.findByIdAndSalonIdAndCustomerId(
            bookingId, salonId, user.id()).orElseThrow(() ->
                TenantInputPolicy.notFound("booking"));
        return cancel(salonId, booking, true);
    }

    Booking rescheduleCustomer(AuthenticatedUser user, long bookingId,
                               LocalDateTime start) {
        requireCustomer(user);
        long salonId = TenantContext.requireSalonId();
        try {
            transactions.executeWithoutResult(status -> {
                Booking booking = bookings.findByIdAndSalonIdAndCustomerId(
                    bookingId, salonId, user.id()).orElseThrow(() ->
                        TenantInputPolicy.notFound("booking"));
                requireConfirmed(booking);
                ValidatedSlot slot = validateSlot(salonId, booking.getStaffId(),
                    booking.getServiceId(), start, bookingId);
                LocalDateTime previous = booking.getStartDateTime();
                if (bookings.rescheduleConfirmed(bookingId, salonId, start, slot.end()) != 1)
                    throw statusConflict();
                Booking rescheduled = bookings.findByIdAndSalonIdAndCustomerId(
                    bookingId, salonId, user.id()).orElseThrow(() ->
                        TenantInputPolicy.notFound("booking"));
                notifications.rescheduled(salonId, rescheduled, previous);
            });
        } catch (DataIntegrityViolationException exception) {
            if (isOverlap(exception)) throw slotUnavailable();
            throw exception;
        }
        return bookings.findByIdAndSalonIdAndCustomerId(bookingId, salonId, user.id())
            .orElseThrow(() -> TenantInputPolicy.notFound("booking"));
    }

    BookingDtos.BookingResponse response(Booking booking) {
        long salonId = TenantContext.requireSalonId();
        String staffName = staff.findByIdAndSalonId(booking.getStaffId(), salonId)
            .map(SalonStaff::getName).orElse("Staff member");
        boolean reviewed = booking.getCustomerId() != null
            && reviews.existsBySalonIdAndBookingIdAndCustomerId(
                salonId, booking.getId(), booking.getCustomerId());
        List<Object[]> display = booking.getCustomerId() == null ? List.of()
            : bookings.findCustomerDisplay(booking.getId(), salonId);
        String customerName = display.isEmpty() ? null : (String) display.get(0)[0];
        String customerPhone = display.isEmpty() ? null : (String) display.get(0)[1];
        return BookingDtos.BookingResponse.from(
            booking, staffName, customerName, customerPhone, reviewed);
    }

    @Transactional(readOnly = true)
    List<Booking> dashboardBookings(LocalDate date, LocalDate startDate,
                                    LocalDate endDate, Long staffId) {
        LocalDate rangeStart;
        LocalDate rangeEnd;
        if (date != null) {
            if (startDate != null || endDate != null)
                throw TenantInputPolicy.validation("date",
                    "use either date or startDate/endDate, not both");
            rangeStart = date;
            rangeEnd = date;
        } else {
            if (startDate == null || endDate == null)
                throw TenantInputPolicy.validation("date",
                    "date or both startDate and endDate are required");
            if (endDate.isBefore(startDate))
                throw TenantInputPolicy.validation("endDate",
                    "must be on or after startDate");
            rangeStart = startDate;
            rangeEnd = endDate;
        }
        if (java.time.temporal.ChronoUnit.DAYS.between(rangeStart, rangeEnd) + 1 > 31)
            throw TenantInputPolicy.validation("endDate",
                "calendar range must not exceed 31 inclusive days");
        if (staffId != null && staffId <= 0)
            throw TenantInputPolicy.validation("staffId", "must be positive");
        long salonId = TenantContext.requireSalonId();
        return bookings.findDashboardBookings(salonId, rangeStart.atStartOfDay(),
            rangeEnd.plusDays(1).atStartOfDay(), staffId);
    }

    @Transactional
    Booking cancelOwner(long bookingId) {
        long salonId = TenantContext.requireSalonId();
        Booking booking = bookings.findByIdAndSalonId(bookingId, salonId)
            .orElseThrow(() -> TenantInputPolicy.notFound("booking"));
        return cancel(salonId, booking, false);
    }

    @Transactional
    Booking transition(long bookingId, BookingStatus target) {
        if (target != BookingStatus.COMPLETED && target != BookingStatus.NO_SHOW)
            throw TenantInputPolicy.validation("status", "must be COMPLETED or NO_SHOW");
        long salonId = TenantContext.requireSalonId();
        Booking booking = bookings.findByIdAndSalonId(bookingId, salonId)
            .orElseThrow(() -> TenantInputPolicy.notFound("booking"));
        requireConfirmed(booking);
        ZoneId zone = ZoneId.of(currentSalon(salonId).getTimezone());
        LocalDateTime localNow = LocalDateTime.now(zone);
        LocalDateTime threshold = target == BookingStatus.COMPLETED
            ? booking.getEndDateTime() : booking.getStartDateTime();
        if (threshold.isAfter(localNow))
            throw TenantInputPolicy.conflict("BOOKING_TRANSITION_INVALID",
                target == BookingStatus.COMPLETED
                    ? "A booking cannot be completed before it ends"
                    : "A future booking cannot be marked no-show");
        if (bookings.transitionConfirmed(bookingId, salonId, target) != 1)
            throw statusConflict();
        return bookings.findByIdAndSalonId(bookingId, salonId)
            .orElseThrow(() -> TenantInputPolicy.notFound("booking"));
    }

    private Booking cancel(long salonId, Booking booking, boolean enforceWindow) {
        if (booking.getStatus() == BookingStatus.CANCELLED) return booking;
        requireConfirmed(booking);
        Salon salon = currentSalon(salonId);
        Instant now = Instant.now();
        LocalDateTime localNow = LocalDateTime.ofInstant(now, ZoneId.of(salon.getTimezone()));
        if (enforceWindow && localNow.plusMinutes(salon.getCancellationWindowMinutes())
                .isAfter(booking.getStartDateTime()))
            throw TenantInputPolicy.conflict("CANCELLATION_WINDOW_CLOSED",
                "The cancellation window for this booking has closed");
        if (bookings.cancelConfirmed(booking.getId(), salonId, now) != 1)
            throw statusConflict();
        Booking cancelled = bookings.findByIdAndSalonId(booking.getId(), salonId)
            .orElseThrow(() -> TenantInputPolicy.notFound("booking"));
        promotions.release(salonId, cancelled.getId(), now);
        if (cancelled.getCustomerId() != null)
            notifications.cancelled(salonId, cancelled, enforceWindow);
        return cancelled;
    }
    private ValidatedSlot validateSlot(long salonId, long staffId, long serviceId,
                                       LocalDateTime start, Long excludedBookingId) {
        if (staffId <= 0) throw TenantInputPolicy.validation("staffId", "must be positive");
        if (serviceId <= 0) throw TenantInputPolicy.validation("serviceId", "must be positive");
        if (start == null) throw TenantInputPolicy.validation("startDatetime", "is required");
        if (start.getSecond() != 0 || start.getNano() != 0 || start.getMinute() % 15 != 0)
            throw TenantInputPolicy.validation("startDatetime",
                "must be on a 15-minute boundary");
        Salon salon = currentSalon(salonId);
        ZoneId zone = ZoneId.of(salon.getTimezone());
        if (!isFutureValidLocalTime(start, zone, ZonedDateTime.now(zone)))
            throw TenantInputPolicy.validation("startDatetime",
                "must be a valid future time in the salon timezone");
        SalonServiceEntity requestedService = services.findByIdAndSalonId(serviceId, salonId)
            .filter(SalonServiceEntity::isActive)
            .orElseThrow(() -> TenantInputPolicy.notFound("service"));
        staff.findByIdAndSalonId(staffId, salonId).filter(SalonStaff::isActive)
            .orElseThrow(() -> TenantInputPolicy.notFound("staff"));
        if (!assignments.existsBySalonIdAndStaffIdAndServiceId(salonId, staffId, serviceId))
            throw TenantInputPolicy.validation("staffId",
                "staff is not assigned to the selected service");
        LocalDateTime end = start.plusMinutes(requestedService.getDurationMinutes());
        int day = dayNumber(start.getDayOfWeek());
        boolean withinHours = hours
            .findAllBySalonIdAndStaffIdOrderByDayOfWeekAscStartTimeAsc(salonId, staffId)
            .stream().filter(hour -> hour.getDayOfWeek() == day)
            .anyMatch(hour -> !start.toLocalTime().isBefore(hour.getStartTime())
                && start.toLocalDate().equals(end.toLocalDate())
                && !end.toLocalTime().isAfter(hour.getEndTime()));
        if (!withinHours)
            throw TenantInputPolicy.validation("startDatetime",
                "the full service duration must be within staff working hours");
        if (timeOff.countOverlapping(salonId, staffId, start, end) > 0)
            throw TenantInputPolicy.conflict("STAFF_UNAVAILABLE",
                "The selected staff member is unavailable at this time");
        if (bookings.countConfirmedOverlappingExcluding(
                salonId, staffId, start, end, excludedBookingId) > 0)
            throw slotUnavailable();
        return new ValidatedSlot(requestedService, end);
    }

    private Salon currentSalon(long salonId) {
        return salons.findById(salonId).orElseThrow(() -> TenantInputPolicy.notFound("salon"));
    }

    private static void requireCustomer(AuthenticatedUser user) {
        if (user == null || user.role() != UserRole.CUSTOMER)
            throw new PlatformApiException(HttpStatus.FORBIDDEN, "FORBIDDEN",
                "Customer access is required");
    }
    private static void requireConfirmed(Booking booking) {
        if (booking.getStatus() != BookingStatus.CONFIRMED) throw statusConflict();
    }

    private static PlatformApiException statusConflict() {
        return TenantInputPolicy.conflict("BOOKING_STATUS_INVALID",
            "Only a confirmed booking can be changed");
    }

    private static PlatformApiException slotUnavailable() {
        return TenantInputPolicy.conflict("SLOT_UNAVAILABLE", SLOT_MESSAGE);
    }

    private static String normalizeKey(String key) {
        if (key == null) return null;
        String normalized = key.trim();
        if (normalized.isEmpty() || normalized.length() > 128)
            throw TenantInputPolicy.validation("Idempotency-Key",
                "must contain between 1 and 128 characters");
        return normalized;
    }

    private static boolean isOverlap(Throwable failure) {
        return hasSqlState(failure, "23P01")
            || containsIgnoreCase(failure, "no_overlapping_bookings");
    }

    private static boolean hasSqlState(Throwable failure, String state) {
        for (Throwable current = failure; current != null; current = current.getCause())
            if (current instanceof SQLException sql && state.equals(sql.getSQLState())) return true;
        return false;
    }

    private static boolean containsIgnoreCase(Throwable failure, String value) {
        String needle = value.toLowerCase(java.util.Locale.ROOT);
        for (Throwable current = failure; current != null; current = current.getCause())
            if (current.getMessage() != null
                    && current.getMessage().toLowerCase(java.util.Locale.ROOT).contains(needle))
                return true;
        return false;
    }

    private static int dayNumber(DayOfWeek day) { return day.getValue() % 7; }

    private static LocalTime ceilQuarterHour(LocalTime time) {
        int minute = time.getMinute();
        int add = (15 - minute % 15) % 15;
        LocalTime result = time.withSecond(0).withNano(0).plusMinutes(add);
        if ((time.getSecond() != 0 || time.getNano() != 0) && add == 0)
            result = result.plusMinutes(15);
        return result;
    }

    private static boolean isFutureValidLocalTime(LocalDateTime local, ZoneId zone,
                                                   ZonedDateTime now) {
        return zone.getRules().getValidOffsets(local).size() == 1
            && local.atZone(zone).isAfter(now);
    }

    private record ValidatedSlot(SalonServiceEntity service, LocalDateTime end) {}
}
