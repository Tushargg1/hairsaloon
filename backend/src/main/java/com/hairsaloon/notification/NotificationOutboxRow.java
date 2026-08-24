package com.hairsaloon.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

/**
 * Schema-only mapping: the notification outbox is read and written exclusively
 * through JdbcTemplate, so nothing references this class. It still must exist,
 * because it is what Hibernate uses to generate the table when Flyway is disabled
 * (tests) and to validate it against the migrations in production. Deleting it
 * breaks NotificationOutboxIntegrationTest.
 */
@Entity
@Table(name = "notification_outbox", uniqueConstraints = {
    @UniqueConstraint(name = "notification_outbox_event_unique",
        columnNames = {"salon_id", "event_key"})
})
class NotificationOutboxRow {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "salon_id", nullable = false) private Long salonId;
    @Column(name = "booking_id", nullable = false) private Long bookingId;
    @Column(name = "event_key", nullable = false, length = 255) private String eventKey;
    @Column(name = "notification_type", nullable = false, length = 40)
    private String notificationType;
    @Column(name = "recipient_email", nullable = false, length = 320)
    private String recipientEmail;
    @Column(nullable = false, length = 255) private String subject;
    @Column(nullable = false, columnDefinition = "TEXT") private String body;
    @Column(name = "attempt_count", nullable = false) private int attemptCount;
    @Column(name = "next_attempt_at", nullable = false) private Instant nextAttemptAt;
    @Column(name = "claimed_by", length = 64) private String claimedBy;
    @Column(name = "claimed_until") private Instant claimedUntil;
    @Column(name = "sent_at") private Instant sentAt;
    @Column(name = "last_error", length = 255) private String lastError;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected NotificationOutboxRow() {}
}
