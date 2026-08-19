package com.hairsaloon.tenantdata;

import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.tenant.Salon;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/salon/dashboard/analytics")
class DashboardAnalyticsController {
    private final SalonOwnershipVerifier ownership;
    private final DashboardAnalyticsService analytics;

    DashboardAnalyticsController(SalonOwnershipVerifier ownership,
                                 DashboardAnalyticsService analytics) {
        this.ownership = ownership;
        this.analytics = analytics;
    }

    @GetMapping
    AnalyticsResponse analytics(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        // Required explicitly on every owner controller method; role checks alone are insufficient.
        Salon salon = ownership.verifyOwner(user);
        return AnalyticsResponse.from(analytics.analytics(salon, startDate, endDate));
    }

    record AnalyticsResponse(long bookingsThisWeek, BigDecimal revenue,
        BigDecimal noShowRate, long completedBookings, long confirmedBookings,
        long cancelledBookings, long noShowBookings, LocalDate rangeStart,
        LocalDate rangeEnd, String currency,
        List<DashboardAnalyticsService.DailyMetric> dailySeries,
        List<DashboardAnalyticsService.Breakdown> serviceBreakdown,
        List<DashboardAnalyticsService.Breakdown> staffBreakdown,
        Map<BookingStatus, Long> statusBreakdown) {
        static AnalyticsResponse from(DashboardAnalyticsService.Analytics value) {
            return new AnalyticsResponse(value.bookingsThisWeek(), value.revenue(),
                value.noShowRate(), value.completedBookings(), value.confirmedBookings(),
                value.cancelledBookings(), value.noShowBookings(), value.rangeStart(),
                value.rangeEnd(), value.currency(), value.dailySeries(),
                value.serviceBreakdown(), value.staffBreakdown(), value.statusBreakdown());
        }
    }
}
