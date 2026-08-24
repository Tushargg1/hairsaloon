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
 * Schema-only mapping: push subscriptions are read and written exclusively through
 * JdbcTemplate, so nothing references this class. It still must exist, because it
 * is what Hibernate uses to generate the table when Flyway is disabled (tests) and
 * to validate it against the migrations in production. Deleting it breaks
 * PushOutboxIntegrationTest.
 */
@Entity
@Table(name = "push_subscriptions", uniqueConstraints = @UniqueConstraint(
    name = "push_subscriptions_endpoint_unique",
    columnNames = {"salon_id", "user_id", "audience", "endpoint_hash"}))
class PushSubscriptionRow {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "salon_id", nullable = false) private Long salonId;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false, length = 16) private String audience;
    @Column(nullable = false, length = 2048) private String endpoint;
    @Column(name = "endpoint_hash", nullable = false, length = 64) private String endpointHash;
    @Column(nullable = false, length = 512) private String p256dh;
    @Column(nullable = false, length = 255) private String auth;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected PushSubscriptionRow() {}

    PushSubscriptionRow(long salonId, long userId, PushSubscriptionAudience audience,
            String endpoint, String endpointHash, String p256dh, String auth, Instant now) {
        this.salonId = salonId; this.userId = userId; this.audience = audience.name();
        this.endpoint = endpoint; this.endpointHash = endpointHash;
        this.p256dh = p256dh; this.auth = auth; this.createdAt = now; this.updatedAt = now;
    }

    void replaceKeys(String p256dh, String auth, Instant now) {
        this.p256dh = p256dh; this.auth = auth; this.updatedAt = now;
    }
}
