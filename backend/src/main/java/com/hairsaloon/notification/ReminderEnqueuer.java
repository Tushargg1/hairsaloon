package com.hairsaloon.notification;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ReminderEnqueuer {
    private final JdbcTemplate jdbc;
    private final NotificationOutboxWriter outbox;

    ReminderEnqueuer(JdbcTemplate jdbc, NotificationOutboxWriter outbox) {
        this.jdbc = jdbc;
        this.outbox = outbox;
    }

    @Transactional
    public int enqueueDueAt(Instant now) {
        LocalDateTime earliestLocal = LocalDateTime.ofInstant(
            now.minus(Duration.ofHours(14)), ZoneId.of("UTC"));
        LocalDateTime latestLocal = LocalDateTime.ofInstant(
            now.plus(Duration.ofHours(39)), ZoneId.of("UTC"));
        // Platform-owned scan: confirmed bookings only, bounded to possible timezone offsets.
        List<Candidate> candidates = jdbc.query("SELECT b.id,b.salon_id,b.start_datetime,"
                + "b.service_name_snapshot,s.name AS salon_name,s.timezone,u.email "
                + "FROM bookings b JOIN salons s ON s.id=b.salon_id "
                + "JOIN users u ON u.id=b.customer_id WHERE b.status='CONFIRMED' "
                + "AND b.start_datetime>? AND b.start_datetime<=?",
            (rs, row) -> candidate(rs), earliestLocal, latestLocal);
        int inserted = 0;
        for (Candidate candidate : candidates) inserted += enqueue(candidate, now);
        return inserted;
    }

    private int enqueue(Candidate candidate, Instant now) {
        ZoneId zone;
        try { zone = ZoneId.of(candidate.timezone()); }
        catch (RuntimeException invalidZone) { return 0; }
        if (zone.getRules().getValidOffsets(candidate.start()).size() != 1) return 0;
        Instant appointment = candidate.start().atZone(zone).toInstant();
        if (!appointment.isAfter(now)) return 0;
        int inserted = 0;
        if (!appointment.isAfter(now.plus(Duration.ofHours(24))))
            inserted += enqueue(candidate, NotificationType.REMINDER_24H,
                "24-hour appointment reminder");
        if (!appointment.isAfter(now.plus(Duration.ofHours(1))))
            inserted += enqueue(candidate, NotificationType.REMINDER_1H,
                "1-hour appointment reminder");
        return inserted;
    }
    private int enqueue(Candidate candidate, NotificationType type, String action) {
        String subject = SafeEmailTemplate.subject(action, candidate.salonName());
        String body = SafeEmailTemplate.bookingBody(candidate.salonName(), action + ".",
            candidate.service(), candidate.start(), candidate.timezone());
        return outbox.enqueue(candidate.salonId(), candidate.bookingId(), type,
            candidate.email(), subject, body, candidate.start().toString()) ? 1 : 0;
    }

    private static Candidate candidate(ResultSet rs) throws SQLException {
        return new Candidate(rs.getLong("id"), rs.getLong("salon_id"),
            rs.getTimestamp("start_datetime").toLocalDateTime(),
            rs.getString("service_name_snapshot"), rs.getString("salon_name"),
            rs.getString("timezone"), rs.getString("email"));
    }

    private record Candidate(long bookingId, long salonId, LocalDateTime start,
                             String service, String salonName, String timezone,
                             String email) {}
}
