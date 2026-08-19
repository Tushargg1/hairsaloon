package com.hairsaloon.notification;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PushOutboxWriter {
    private final JdbcTemplate jdbc;
    private final boolean postgres;

    public PushOutboxWriter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.postgres = Boolean.TRUE.equals(jdbc.execute(
            (org.springframework.jdbc.core.ConnectionCallback<Boolean>) connection ->
                "PostgreSQL".equals(connection.getMetaData().getDatabaseProductName())));
    }

    public int enqueueForUser(long salonId, long bookingId, long userId,
            PushSubscriptionAudience audience, NotificationType type, String title,
            String body, String targetUrl, String occurrence) {
        List<Subscription> subscriptions = jdbc.query("SELECT id,endpoint,p256dh,auth "
                + "FROM push_subscriptions WHERE salon_id=? AND user_id=? AND audience=?",
            (rs, row) -> new Subscription(rs.getLong("id"), rs.getString("endpoint"),
                rs.getString("p256dh"), rs.getString("auth")),
            salonId, userId, audience.name());
        int inserted = 0;
        for (Subscription subscription : subscriptions) {
            inserted += enqueue(salonId, bookingId, userId, subscription, type, title,
                body, targetUrl, occurrence) ? 1 : 0;
        }
        return inserted;
    }

    private boolean enqueue(long salonId, long bookingId, long userId,
            Subscription subscription, NotificationType type, String title, String body,
            String targetUrl, String occurrence) {
        String eventKey = bookingId + ":" + type + ":" + subscription.id() + ":"
            + SafeEmailTemplate.clean(occurrence, 80);
        Timestamp now = Timestamp.from(Instant.now());
        Object[] values = {salonId, bookingId, subscription.id(), userId, eventKey,
            type.name(), subscription.endpoint(), subscription.p256dh(), subscription.auth(),
            SafeEmailTemplate.clean(title, 255), SafeEmailTemplate.clean(body, 500),
            SafeEmailTemplate.clean(targetUrl, 2048), now, now};
        if (postgres) return postgresInsert(values);
        return h2Insert(values, salonId, eventKey);
    }
    private boolean postgresInsert(Object[] values) {
        return jdbc.update("INSERT INTO push_outbox (salon_id,booking_id,subscription_id,"
                + "recipient_user_id,event_key,notification_type,endpoint,p256dh,auth,title,body,"
                + "target_url,attempt_count,next_attempt_at,created_at) "
                + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?) ON CONFLICT (salon_id,event_key) "
                + "DO NOTHING", values) == 1;
    }

    private boolean h2Insert(Object[] values, long salonId, String eventKey) {
        Object[] all = java.util.Arrays.copyOf(values, values.length + 2);
        all[values.length] = salonId;
        all[values.length + 1] = eventKey;
        return jdbc.update("INSERT INTO push_outbox (salon_id,booking_id,subscription_id,"
                + "recipient_user_id,event_key,notification_type,endpoint,p256dh,auth,title,body,"
                + "target_url,attempt_count,next_attempt_at,created_at) "
                + "SELECT ?,?,?,?,?,?,?,?,?,?,?,?,0,?,? WHERE NOT EXISTS "
                + "(SELECT 1 FROM push_outbox WHERE salon_id=? AND event_key=?)", all) == 1;
    }

    private record Subscription(long id, String endpoint, String p256dh, String auth) {}
}
