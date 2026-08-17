package com.hairsaloon.tenantdata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "reviews")
class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "salon_id", nullable = false)
    private Long salonId;
    @Column(name = "booking_id", nullable = false, unique = true)
    private Long bookingId;
    @Column(name = "customer_id", nullable = false)
    private Long customerId;
    @Column(nullable = false)
    private short rating;
    @Column(columnDefinition = "TEXT")
    private String comment;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Review() {}

    Review(long salonId, long bookingId, long customerId, int rating, String comment) {
        this.salonId = salonId;
        this.bookingId = bookingId;
        this.customerId = customerId;
        this.rating = (short) rating;
        this.comment = comment;
    }

    Long getId() { return id; }
    int getRating() { return rating; }
    String getComment() { return comment; }
    Instant getCreatedAt() { return createdAt; }
}
