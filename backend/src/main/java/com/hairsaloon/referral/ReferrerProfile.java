package com.hairsaloon.referral;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

/** Per-referrer settings: their share code, admin approval and payout rate. */
@Entity
@Table(name = "referrer_profiles")
public class ReferrerProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "referral_code", nullable = false, unique = true, length = 16)
    private String referralCode;

    @Column(nullable = false)
    private boolean approved = false;

    @Column(name = "per_referral_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal perReferralAmount = BigDecimal.ZERO.setScale(2);

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ReferrerProfile() {
    }

    public ReferrerProfile(Long userId, String referralCode) {
        this.userId = userId;
        this.referralCode = referralCode;
    }

    public void approve(BigDecimal perReferralAmount) {
        this.approved = true;
        if (perReferralAmount != null) this.perReferralAmount = perReferralAmount;
    }

    public void setPerReferralAmount(BigDecimal amount) {
        if (amount != null) this.perReferralAmount = amount;
    }

    public Long getUserId() { return userId; }
    public String getReferralCode() { return referralCode; }
    public boolean isApproved() { return approved; }
    public BigDecimal getPerReferralAmount() { return perReferralAmount; }
    public Instant getCreatedAt() { return createdAt; }
}
