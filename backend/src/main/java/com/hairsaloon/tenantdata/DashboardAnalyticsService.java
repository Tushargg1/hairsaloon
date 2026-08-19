package com.hairsaloon.tenantdata;

import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.TenantContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class DashboardAnalyticsService {
    static final String DEFAULT_CURRENCY = "USD";
    private final BookingRepository bookings;
    private final SalonStaffRepository staff;
    private final Clock clock;

    DashboardAnalyticsService(BookingRepository bookings, SalonStaffRepository staff, Clock clock) {
        this.bookings = bookings;
        this.staff = staff;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    Analytics currentSalonWeek(Salon salon) { return analytics(salon, null, null); }

    @Transactional(readOnly = true)
    Analytics analytics(Salon salon, LocalDate requestedStart, LocalDate requestedEnd) {
        long salonId = TenantContext.requireSalonId();
        if (salon == null || salon.getId() == null || salon.getId() != salonId)
            throw new IllegalStateException("Verified salon does not match tenant context");
        LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneId.of(salon.getTimezone()));
        LocalDate start;
        LocalDate end;
        if (requestedStart == null && requestedEnd == null) {
            start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            end = start.plusDays(6);
        } else {
            if (requestedStart == null || requestedEnd == null)
                throw TenantInputPolicy.validation("range", "startDate and endDate are both required");
            if (requestedEnd.isBefore(requestedStart))
                throw TenantInputPolicy.validation("endDate", "must be on or after startDate");
            if (ChronoUnit.DAYS.between(requestedStart, requestedEnd) + 1 > 366)
                throw TenantInputPolicy.validation("endDate",
                    "analytics range must not exceed 366 inclusive days");
            start = requestedStart;
            end = requestedEnd;
        }
        List<Booking> values = bookings.findDashboardBookings(
            salonId, start.atStartOfDay(), end.plusDays(1).atStartOfDay(), null);
        return aggregate(salonId, values, start, end);
    }
    private Analytics aggregate(long salonId, List<Booking> values,
                                LocalDate start, LocalDate end) {
        Map<BookingStatus, Long> statuses = new EnumMap<>(BookingStatus.class);
        for (BookingStatus status : BookingStatus.values()) statuses.put(status, 0L);
        Map<LocalDate, MutableMetric> days = new LinkedHashMap<>();
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1))
            days.put(day, new MutableMetric());
        Map<Long, MutableBreakdown> services = new LinkedHashMap<>();
        Map<Long, MutableBreakdown> staffMembers = new LinkedHashMap<>();
        BigDecimal revenue = BigDecimal.ZERO;
        for (Booking booking : values) {
            statuses.compute(booking.getStatus(), (status, count) -> count + 1);
            BigDecimal completedRevenue = booking.getStatus() == BookingStatus.COMPLETED
                ? booking.getPriceSnapshot() : BigDecimal.ZERO;
            revenue = revenue.add(completedRevenue);
            days.get(booking.getStartDateTime().toLocalDate()).add(completedRevenue);
            services.computeIfAbsent(booking.getServiceId(), id ->
                new MutableBreakdown(id, booking.getServiceNameSnapshot()))
                .add(completedRevenue);
            staffMembers.computeIfAbsent(booking.getStaffId(), id ->
                new MutableBreakdown(id, staff.findByIdAndSalonId(id, salonId)
                    .map(SalonStaff::getName).orElse("Staff member")))
                .add(completedRevenue);
        }
        long completed = statuses.get(BookingStatus.COMPLETED);
        long noShow = statuses.get(BookingStatus.NO_SHOW);
        long outcomes = completed + noShow;
        BigDecimal rate = outcomes == 0 ? BigDecimal.ZERO.setScale(2)
            : BigDecimal.valueOf(noShow * 100).divide(
                BigDecimal.valueOf(outcomes), 2, RoundingMode.HALF_UP);
        List<DailyMetric> daily = days.entrySet().stream()
            .map(entry -> new DailyMetric(entry.getKey(), entry.getValue().bookings,
                money(entry.getValue().revenue))).toList();
        List<Breakdown> byService = services.values().stream()
            .map(MutableBreakdown::view).toList();
        List<Breakdown> byStaff = staffMembers.values().stream()
            .map(MutableBreakdown::view).toList();
        return new Analytics(values.size(), money(revenue), rate, completed,
            statuses.get(BookingStatus.CONFIRMED), statuses.get(BookingStatus.CANCELLED),
            noShow, start, end, DEFAULT_CURRENCY, daily, byService, byStaff,
            Map.copyOf(statuses));
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
    record Analytics(long bookingsThisWeek, BigDecimal revenue, BigDecimal noShowRate,
        long completedBookings, long confirmedBookings, long cancelledBookings,
        long noShowBookings, LocalDate rangeStart, LocalDate rangeEnd, String currency,
        List<DailyMetric> dailySeries, List<Breakdown> serviceBreakdown,
        List<Breakdown> staffBreakdown, Map<BookingStatus, Long> statusBreakdown) {}
    record DailyMetric(LocalDate date, long bookings, BigDecimal revenue) {}
    record Breakdown(Long id, String name, long bookings, BigDecimal revenue) {}

    private static final class MutableMetric {
        private long bookings;
        private BigDecimal revenue = BigDecimal.ZERO;
        void add(BigDecimal amount) { bookings++; revenue = revenue.add(amount); }
    }
    private static final class MutableBreakdown {
        private final Long id;
        private final String name;
        private long bookings;
        private BigDecimal revenue = BigDecimal.ZERO;
        MutableBreakdown(Long id, String name) { this.id = id; this.name = name; }
        void add(BigDecimal amount) { bookings++; revenue = revenue.add(amount); }
        Breakdown view() { return new Breakdown(id, name, bookings, money(revenue)); }
    }
}
