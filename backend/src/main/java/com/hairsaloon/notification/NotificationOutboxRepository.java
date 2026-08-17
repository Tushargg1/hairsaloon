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
class NotificationOutboxRepository {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    NotificationOutboxRepository(JdbcTemplate jdbc, PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.transactions = new TransactionTemplate(manager);
    }

    List<Delivery> claimPlatformBatch(String claimant, Instant now, Instant claimedUntil,
                                      int batchSize, int maxAttempts) {
        return transactions.execute(status -> {
            // Platform-owned global query: only unsent, due, retryable, unleased rows.
            List<Delivery> rows = jdbc.query("SELECT id,salon_id,event_key,recipient_email,"
                    + "subject,body,attempt_count FROM notification_outbox "
                    + "WHERE sent_at IS NULL AND attempt_count < ? "
                    + "AND next_attempt_at <= ? AND (claimed_until IS NULL OR claimed_until < ?) "
                    + "ORDER BY next_attempt_at,id LIMIT ? FOR UPDATE SKIP LOCKED",
                (rs, row) -> delivery(rs), maxAttempts, timestamp(now), timestamp(now), batchSize);
            for (Delivery row : rows) {
                jdbc.update("UPDATE notification_outbox SET claimed_by=?,claimed_until=?,"
                        + "attempt_count=attempt_count+1 WHERE id=? AND salon_id=? "
                        + "AND sent_at IS NULL",
                    claimant, timestamp(claimedUntil), row.id(), row.salonId());
            }
            return rows.stream().map(Delivery::incremented).toList();
        });
    }

    boolean markSent(long salonId, long id, String claimant, Instant sentAt) {
        return jdbc.update("UPDATE notification_outbox SET sent_at=?,claimed_by=NULL,"
                + "claimed_until=NULL,last_error=NULL WHERE id=? AND salon_id=? "
                + "AND claimed_by=? AND sent_at IS NULL", timestamp(sentAt), id, salonId, claimant) == 1;
    }
    void markFailed(long salonId, long id, String claimant, Instant nextAttempt,
                    String failureType) {
        jdbc.update("UPDATE notification_outbox SET next_attempt_at=?,claimed_by=NULL,"
                + "claimed_until=NULL,last_error=? WHERE id=? AND salon_id=? "
                + "AND claimed_by=? AND sent_at IS NULL",
            timestamp(nextAttempt), SafeEmailTemplate.clean(failureType, 255), id, salonId, claimant);
    }

    private static Timestamp timestamp(Instant value) {
        return Timestamp.from(value);
    }

    private static Delivery delivery(ResultSet rs) throws SQLException {
        return new Delivery(rs.getLong("id"), rs.getLong("salon_id"),
            rs.getString("event_key"), rs.getString("recipient_email"),
            rs.getString("subject"), rs.getString("body"), rs.getInt("attempt_count"));
    }

    record Delivery(long id, long salonId, String eventKey, String recipient,
                    String subject, String body, int attemptCount) {
        Delivery incremented() {
            return new Delivery(id, salonId, eventKey, recipient, subject, body,
                attemptCount + 1);
        }
    }
}
