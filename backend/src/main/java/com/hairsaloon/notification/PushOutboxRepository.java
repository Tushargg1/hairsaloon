package com.hairsaloon.notification;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Repository
class PushOutboxRepository {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    PushOutboxRepository(JdbcTemplate jdbc, PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.transactions = new TransactionTemplate(manager);
    }

    List<Delivery> claimPlatformBatch(String claimant, Instant now, Instant claimedUntil,
            int batchSize, int maxAttempts) {
        return transactions.execute(status -> {
            List<Delivery> rows = jdbc.query("SELECT id,salon_id,subscription_id,event_key,"
                    + "endpoint,p256dh,auth,title,body,target_url,attempt_count FROM push_outbox "
                    + "WHERE sent_at IS NULL AND discarded_at IS NULL AND attempt_count < ? "
                    + "AND next_attempt_at <= ? AND (claimed_until IS NULL OR claimed_until < ?) "
                    + "ORDER BY next_attempt_at,id LIMIT ? FOR UPDATE SKIP LOCKED",
                (rs, row) -> delivery(rs), maxAttempts, timestamp(now), timestamp(now), batchSize);
            for (Delivery row : rows) {
                jdbc.update("UPDATE push_outbox SET claimed_by=?,claimed_until=?,"
                        + "attempt_count=attempt_count+1 WHERE id=? AND salon_id=? "
                        + "AND sent_at IS NULL AND discarded_at IS NULL",
                    claimant, timestamp(claimedUntil), row.id(), row.salonId());
            }
            return rows.stream().map(Delivery::incremented).toList();
        });
    }

    boolean markSent(long salonId, long id, String claimant, Instant sentAt) {
        return jdbc.update("UPDATE push_outbox SET sent_at=?,claimed_by=NULL,claimed_until=NULL,"
                + "last_error=NULL WHERE id=? AND salon_id=? AND claimed_by=? "
                + "AND sent_at IS NULL AND discarded_at IS NULL",
            timestamp(sentAt), id, salonId, claimant) == 1;
    }
    void markRetry(long salonId, long id, String claimant, Instant nextAttempt,
            String failure) {
        jdbc.update("UPDATE push_outbox SET next_attempt_at=?,claimed_by=NULL,claimed_until=NULL,"
                + "last_error=? WHERE id=? AND salon_id=? AND claimed_by=? AND sent_at IS NULL "
                + "AND discarded_at IS NULL", timestamp(nextAttempt), safeFailure(failure),
            id, salonId, claimant);
    }

    void markPermanent(long salonId, long id, String claimant, Instant discardedAt,
            String failure) {
        jdbc.update("UPDATE push_outbox SET discarded_at=?,claimed_by=NULL,claimed_until=NULL,"
                + "last_error=? WHERE id=? AND salon_id=? AND claimed_by=? AND sent_at IS NULL "
                + "AND discarded_at IS NULL", timestamp(discardedAt), safeFailure(failure),
            id, salonId, claimant);
    }

    private static String safeFailure(String value) {
        return SafeEmailTemplate.clean(value == null ? "UNKNOWN" : value, 255);
    }

    private static Timestamp timestamp(Instant value) {
        return Timestamp.from(value);
    }

    private static Delivery delivery(ResultSet rs) throws SQLException {
        Number subscription = (Number) rs.getObject("subscription_id");
        return new Delivery(rs.getLong("id"), rs.getLong("salon_id"),
            subscription == null ? null : subscription.longValue(), rs.getString("event_key"),
            rs.getString("endpoint"), rs.getString("p256dh"), rs.getString("auth"),
            rs.getString("title"), rs.getString("body"), rs.getString("target_url"),
            rs.getInt("attempt_count"));
    }

    record Delivery(long id, long salonId, Long subscriptionId, String eventKey,
            String endpoint, String p256dh, String auth, String title, String body,
            String targetUrl, int attemptCount) {
        Delivery incremented() {
            return new Delivery(id, salonId, subscriptionId, eventKey, endpoint, p256dh,
                auth, title, body, targetUrl, attemptCount + 1);
        }

        PushMessage message() {
            return new PushMessage(endpoint, p256dh, auth, title, body, targetUrl, eventKey);
        }
    }
}
