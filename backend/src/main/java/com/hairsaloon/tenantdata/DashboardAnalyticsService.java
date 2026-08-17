package com.hairsaloon.tenantdata;

import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.TenantContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class DashboardAnalyticsService {
    static final String DEFAULT_CURRENCY = "USD";
    private final BookingRepository bookings;
    private final Clock clock;

    DashboardAnalyticsService(BookingRepository bookings, Clock clock) {
        this.bookings = bookings;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    Analytics currentSalonWeek(Salon salon) {
        long salonId = TenantContext.requireSalonId();
        if (!salonIdEquals(salon, salonId)) {
            throw new IllegalStateException("Verified salon does not match tenant context");
        }
        LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneId.of(salon.getTimezone()));
        // Calendar weeks are Monday 00:00 inclusive through next Monday 00:00 exclusive;
        // rangeEnd is the inclusive Sunday date returned to clients.
        LocalDate rangeStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate rangeEnd = rangeStart.plusDays(6);
        Object[] totals = bookings.summarizeDashboardWeek(salonId,
            rangeStart.atStartOfDay(), rangeEnd.plusDays(1).atStartOfDay()).get(0);
        long completed = number(totals[1]);
        long noShow = number(totals[4]);
        long attendedOutcomeCount = completed + noShow;
        BigDecimal noShowRate = attendedOutcomeCount == 0 ? BigDecimal.ZERO.setScale(2)
            : BigDecimal.valueOf(noShow).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(attendedOutcomeCount), 2, RoundingMode.HALF_UP);
        return new Analytics(number(totals[0]), decimal(totals[5]), noShowRate,
            completed, number(totals[2]), number(totals[3]), noShow,
            rangeStart, rangeEnd, DEFAULT_CURRENCY);
    }

    private static boolean salonIdEquals(Salon salon, long salonId) {
        return salon != null && salon.getId() != null && salon.getId() == salonId;
    }
    private static long number(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }

    private static BigDecimal decimal(Object value) {
        if (value == null) return BigDecimal.ZERO.setScale(2);
        BigDecimal result = value instanceof BigDecimal decimal
            ? decimal : new BigDecimal(value.toString());
        return result.setScale(2, RoundingMode.HALF_UP);
    }

    record Analytics(long bookingsThisWeek, BigDecimal revenue, BigDecimal noShowRate,
        long completedBookings, long confirmedBookings, long cancelledBookings,
        long noShowBookings, LocalDate rangeStart, LocalDate rangeEnd, String currency) {}
}
