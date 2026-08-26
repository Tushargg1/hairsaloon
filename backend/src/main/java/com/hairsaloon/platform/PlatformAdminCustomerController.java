package com.hairsaloon.platform;

import com.hairsaloon.auth.User;
import com.hairsaloon.auth.UserRepository;
import com.hairsaloon.auth.UserRole;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/admin/customers")
class PlatformAdminCustomerController {

    private final UserRepository users;
    private final JdbcTemplate jdbc;

    PlatformAdminCustomerController(UserRepository users, JdbcTemplate jdbc) {
        this.users = users;
        this.jdbc = jdbc;
    }

    @GetMapping
    List<CustomerView> allCustomers() {
        return users.findAll().stream()
            .filter(u -> u.getRole() == UserRole.CUSTOMER)
            .map(CustomerView::from)
            .toList();
    }

    @GetMapping("/{id}")
    CustomerDetailView customerDetail(@PathVariable long id) {
        User user = users.findById(id).orElseThrow(() -> InputPolicy.notFound("customer"));
        List<BookingView> bookings = jdbc.query(
            """
            SELECT b.id, b.salon_id, s.name as salon_name, b.service_name_snapshot,
                   b.start_datetime, b.end_datetime, b.status, b.price_snapshot,
                   b.promo_code, b.created_at, b.cancelled_at
            FROM bookings b
            LEFT JOIN salons s ON s.id = b.salon_id
            WHERE b.customer_id = ?
            ORDER BY b.start_datetime DESC
            """,
            (rs, rowNum) -> new BookingView(
                rs.getLong("id"),
                rs.getLong("salon_id"),
                rs.getString("salon_name"),
                rs.getString("service_name_snapshot"),
                rs.getString("start_datetime"),
                rs.getString("end_datetime"),
                rs.getString("status"),
                rs.getBigDecimal("price_snapshot"),
                rs.getString("promo_code"),
                rs.getString("created_at"),
                rs.getString("cancelled_at")
            ),
            id
        );
        return new CustomerDetailView(
            user.getId(), user.getName(), user.getPhone(), user.getEmail(),
            user.getCreatedAt() != null ? user.getCreatedAt().toString() : null,
            bookings
        );
    }

    record CustomerView(Long id, String name, String phone, String email, String createdAt) {
        static CustomerView from(User u) {
            return new CustomerView(u.getId(), u.getName(), u.getPhone(), u.getEmail(),
                u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
        }
    }

    record CustomerDetailView(Long id, String name, String phone, String email,
                              String createdAt, List<BookingView> bookings) {}

    record BookingView(Long id, Long salonId, String salonName, String serviceName,
                       String startDatetime, String endDatetime, String status,
                       java.math.BigDecimal price, String promoCode,
                       String createdAt, String cancelledAt) {}
}
