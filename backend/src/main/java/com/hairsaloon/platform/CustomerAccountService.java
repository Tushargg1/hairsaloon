package com.hairsaloon.platform;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cross-tenant reads and writes for a signed-in customer's own account: saved salons
 * and booking history. These span every salon, so they deliberately sit outside the
 * tenant-scoped repositories and query by {@code customer_id} / {@code user_id}.
 */
@Service
class CustomerAccountService {

    private static final int HISTORY_LIMIT = 50;

    private final JdbcTemplate jdbc;

    CustomerAccountService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    List<FavoriteView> favorites(long userId) {
        return jdbc.query("""
            SELECT f.salon_id, s.name, s.subdomain, s.city, s.logo_url
            FROM user_favorites f JOIN salons s ON s.id = f.salon_id
            WHERE f.user_id = ? ORDER BY f.created_at DESC
            """, (rs, row) -> new FavoriteView(
                rs.getLong("salon_id"), rs.getString("name"),
                rs.getString("subdomain"), rs.getString("city"),
                rs.getString("logo_url")), userId);
    }

    @Transactional
    void addFavorite(long userId, long salonId) {
        Integer activeSalon = jdbc.queryForObject(
            "SELECT COUNT(*) FROM salons WHERE id = ? AND status = 'ACTIVE'",
            Integer.class, salonId);
        if (activeSalon == null || activeSalon == 0) {
            throw new PlatformApiException(HttpStatus.NOT_FOUND, "SALON_NOT_FOUND",
                "Salon not found");
        }
        try {
            jdbc.update("INSERT INTO user_favorites (user_id, salon_id) VALUES (?, ?)",
                userId, salonId);
        } catch (DuplicateKeyException alreadySaved) {
            // Adding an existing favorite is idempotent.
        }
    }

    @Transactional
    void removeFavorite(long userId, long salonId) {
        jdbc.update("DELETE FROM user_favorites WHERE user_id = ? AND salon_id = ?",
            userId, salonId);
    }

    @Transactional(readOnly = true)
    List<BookingHistoryView> bookingHistory(long userId) {
        return jdbc.query("""
            SELECT b.id, b.salon_id, s.name AS salon_name, s.subdomain,
                   b.service_name_snapshot, b.start_datetime, b.end_datetime,
                   b.status, b.price_snapshot, st.name AS staff_name
            FROM bookings b
            JOIN salons s ON s.id = b.salon_id
            JOIN salon_staff st ON st.id = b.staff_id
            WHERE b.customer_id = ?
            ORDER BY b.start_datetime DESC
            LIMIT ?
            """, (rs, row) -> new BookingHistoryView(
                rs.getLong("id"), rs.getLong("salon_id"),
                rs.getString("salon_name"), rs.getString("subdomain"),
                rs.getString("service_name_snapshot"),
                rs.getObject("start_datetime", LocalDateTime.class),
                rs.getObject("end_datetime", LocalDateTime.class),
                rs.getString("status"),
                rs.getBigDecimal("price_snapshot"),
                rs.getString("staff_name")), userId, HISTORY_LIMIT);
    }

    record FavoriteView(long salonId, String name, String subdomain, String city,
                        String logoUrl) {}

    record BookingHistoryView(long id, long salonId, String salonName, String subdomain,
                              String serviceName, LocalDateTime startDateTime,
                              LocalDateTime endDateTime, String status,
                              BigDecimal price, String staffName) {}
}
