package com.hairsaloon.notification;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class NotificationOutboxWriter {
    private final JdbcTemplate jdbc;
    private final boolean postgres;

    public NotificationOutboxWriter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.postgres = Boolean.TRUE.equals(jdbc.execute(
            (org.springframework.jdbc.core.ConnectionCallback<Boolean>) connection ->
                "PostgreSQL".equals(connection.getMetaData().getDatabaseProductName())));
    }

    public boolean enqueue(long salonId, long bookingId, NotificationType type,
            String recipient, String subject, String body, String occurrence) {
        if (recipient == null || recipient.isBlank()) return false;
        String normalizedRecipient = recipient.trim().toLowerCase(java.util.Locale.ROOT);
        String eventKey = bookingId + ":" + type + ":" + hash(normalizedRecipient)
            + ":" + SafeEmailTemplate.clean(occurrence, 80);
        Timestamp now = Timestamp.from(Instant.now());
        if (postgres) {
            return jdbc.update("INSERT INTO notification_outbox "
                    + "(salon_id,booking_id,event_key,notification_type,recipient_email,subject,body,"
                    + "attempt_count,next_attempt_at,created_at) VALUES (?,?,?,?,?,?,?,0,?,?) "
                    + "ON CONFLICT (salon_id,event_key) DO NOTHING",
                salonId, bookingId, eventKey, type.name(), normalizedRecipient,
                SafeEmailTemplate.clean(subject, 255), body, now, now) == 1;
        } else {
            return jdbc.update("INSERT INTO notification_outbox "
                    + "(salon_id,booking_id,event_key,notification_type,recipient_email,subject,body,"
                    + "attempt_count,next_attempt_at,created_at) SELECT ?,?,?,?,?,?,?,0,?,? "
                    + "WHERE NOT EXISTS (SELECT 1 FROM notification_outbox "
                    + "WHERE salon_id=? AND event_key=?)",
                salonId, bookingId, eventKey, type.name(), normalizedRecipient,
                SafeEmailTemplate.clean(subject, 255), body, now, now,
                salonId, eventKey) == 1;
        }
    }

    public int discardPendingReminders(long salonId, long bookingId) {
        return jdbc.update("DELETE FROM notification_outbox WHERE salon_id=? AND booking_id=? "
                + "AND sent_at IS NULL AND notification_type IN ('REMINDER_24H','REMINDER_1H')",
            salonId, bookingId);
    }

    private static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8))).substring(0, 24);
        } catch (java.security.NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
