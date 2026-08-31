package com.hairsaloon.tenantdata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

/** A 5-star review imported from a salon's Google Business profile. */
@Entity
@Table(name = "google_reviews")
public class GoogleReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "salon_id", nullable = false)
    private Long salonId;

    @Column(name = "author_name", length = 255)
    private String authorName;

    @Column(name = "author_photo_url", columnDefinition = "TEXT")
    private String authorPhotoUrl;

    @Column(nullable = false)
    private short rating;

    @Column(columnDefinition = "TEXT")
    private String text;

    @Column(name = "relative_time", length = 120)
    private String relativeTime;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected GoogleReview() {
    }

    public GoogleReview(long salonId, String authorName, String authorPhotoUrl, short rating,
                        String text, String relativeTime, Instant publishedAt, int sortOrder) {
        this.salonId = salonId;
        this.authorName = authorName;
        this.authorPhotoUrl = authorPhotoUrl;
        this.rating = rating;
        this.text = text;
        this.relativeTime = relativeTime;
        this.publishedAt = publishedAt;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public Long getSalonId() { return salonId; }
    public String getAuthorName() { return authorName; }
    public String getAuthorPhotoUrl() { return authorPhotoUrl; }
    public short getRating() { return rating; }
    public String getText() { return text; }
    public String getRelativeTime() { return relativeTime; }
    public Instant getPublishedAt() { return publishedAt; }
    public int getSortOrder() { return sortOrder; }
}
