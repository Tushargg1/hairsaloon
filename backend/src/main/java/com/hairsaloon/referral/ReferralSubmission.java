package com.hairsaloon.referral;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

/**
 * A salon referred by a referrer. The salon details are set once at creation and
 * never change; only the admin-driven status/amount move forward.
 */
@Entity
@Table(name = "referral_submissions")
public class ReferralSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "referrer_id", nullable = false)
    private Long referrerId;

    @Column(name = "salon_name", nullable = false, length = 160)
    private String salonName;

    @Column(name = "salon_phone", nullable = false, length = 32)
    private String salonPhone;

    @Column(name = "salon_phone_normalized", nullable = false, length = 32)
    private String salonPhoneNormalized;

    @Column(name = "maps_url", nullable = false, columnDefinition = "TEXT")
    private String mapsUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ReferralStatus status = ReferralStatus.VERIFYING;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO.setScale(2);

    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    protected ReferralSubmission() {
    }

    public ReferralSubmission(Long referrerId, String salonName, String salonPhone,
                              String salonPhoneNormalized, String mapsUrl) {
        this.referrerId = referrerId;
        this.salonName = salonName;
        this.salonPhone = salonPhone;
        this.salonPhoneNormalized = salonPhoneNormalized;
        this.mapsUrl = mapsUrl;
    }

    /** Admin verified the referral; it becomes payable at the given amount. */
    public void verify(BigDecimal amount) {
        this.status = ReferralStatus.PENDING;
        if (amount != null) this.amount = amount;
        this.decidedAt = Instant.now();
    }

    public void reject(String reason) {
        this.status = ReferralStatus.REJECTED;
        this.rejectReason = reason;
        this.decidedAt = Instant.now();
    }

    public void markPaid() {
        this.status = ReferralStatus.PAID;
        this.paidAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getReferrerId() { return referrerId; }
    public String getSalonName() { return salonName; }
    public String getSalonPhone() { return salonPhone; }
    public String getSalonPhoneNormalized() { return salonPhoneNormalized; }
    public String getMapsUrl() { return mapsUrl; }
    public ReferralStatus getStatus() { return status; }
    public BigDecimal getAmount() { return amount; }
    public String getRejectReason() { return rejectReason; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getDecidedAt() { return decidedAt; }
    public Instant getPaidAt() { return paidAt; }
}
