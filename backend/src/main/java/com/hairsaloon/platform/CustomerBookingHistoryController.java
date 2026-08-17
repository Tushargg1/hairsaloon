package com.hairsaloon.platform;

import com.hairsaloon.auth.AuthenticatedUser;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/platform/my-bookings")
class CustomerBookingHistoryController {

    private final JdbcTemplate jdbc;

    CustomerBookingHistoryController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    List<BookingHistoryItem> list(@AuthenticationPrincipal AuthenticatedUser user) {
        return jdbc.query("""
            SELECT b.id, b.salon_id, s.name AS salon_name, s.subdomain,
                   b.service_name_snapshot, b.start_datetime, b.end_datetime,
                   b.status, b.price_snapshot, st.name AS staff_name
            FROM bookings b
            JOIN salons s ON s.id = b.salon_id
            JOIN salon_staff st ON st.id = b.staff_id
            WHERE b.customer_id = ?
            ORDER BY b.start_datetime DESC
            LIMIT 50
            """, (rs, row) -> new BookingHistoryItem(
                rs.getLong("id"), rs.getLong("salon_id"),
                rs.getString("salon_name"), rs.getString("subdomain"),
                rs.getString("service_name_snapshot"),
                rs.getObject("start_datetime", LocalDateTime.class),
                rs.getObject("end_datetime", LocalDateTime.class),
                rs.getString("status"),
                rs.getBigDecimal("price_snapshot"),
                rs.getString("staff_name")), user.id());
    }

    record BookingHistoryItem(long id, long salonId, String salonName, String subdomain,
                              String serviceName, LocalDateTime startDateTime,
                              LocalDateTime endDateTime, String status,
                              java.math.BigDecimal price, String staffName) {}
}
