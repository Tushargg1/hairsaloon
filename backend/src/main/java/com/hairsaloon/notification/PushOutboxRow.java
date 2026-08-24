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
 * Schema-only mapping: the push outbox is read and written exclusively through
 * JdbcTemplate, so nothing references this class. It still must exist, because it
 * is what Hibernate uses to generate the table when Flyway is disabled (tests)
 * and to validate it against the migrations in production. Deleting it breaks
 * PushOutboxIntegrationTest.
 */
@Entity
@Table(name = "push_outbox", uniqueConstraints = @UniqueConstraint(
    name = "push_outbox_event_unique", columnNames = {"salon_id", "event_key"}))
class PushOutboxRow {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "salon_id", nullable = false) private Long salonId;
    @Column(name = "booking_id", nullable = false) private Long bookingId;
    @Column(name = "subscription_id") private Long subscriptionId;
    @Column(name = "recipient_user_id", nullable = false) private Long recipientUserId;
    @Column(name = "event_key", nullable = false, length = 255) private String eventKey;
    @Column(name = "notification_type", nullable = false, length = 40) private String type;
    @Column(nullable = false, length = 2048) private String endpoint;
    @Column(nullable = false, length = 512) private String p256dh;
    @Column(nullable = false, length = 255) private String auth;
    @Column(nullable = false, length = 255) private String title;
    @Column(nullable = false, length = 500) private String body;
    @Column(name = "target_url", nullable = false, length = 2048) private String targetUrl;
    @Column(name = "attempt_count", nullable = false) private int attemptCount;
    @Column(name = "next_attempt_at", nullable = false) private Instant nextAttemptAt;
    @Column(name = "claimed_by", length = 64) private String claimedBy;
    @Column(name = "claimed_until") private Instant claimedUntil;
    @Column(name = "sent_at") private Instant sentAt;
    @Column(name = "discarded_at") private Instant discardedAt;
    @Column(name = "last_error", length = 255) private String lastError;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected PushOutboxRow() {}
}
