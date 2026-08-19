package com.hairsaloon.tenantdata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "promotions", uniqueConstraints = @UniqueConstraint(
    name = "promotions_code_unique", columnNames = {"salon_id", "code_normalized"}))
public class Promotion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "salon_id", nullable = false) private Long salonId;
    @Column(nullable = false, length = 40) private String code;
    @Column(name = "code_normalized", nullable = false, length = 40) private String codeNormalized;
    @Enumerated(EnumType.STRING) @Column(name = "discount_type", nullable = false, length = 16)
    private PromotionDiscountType discountType;
    @Column(name = "discount_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountValue;
    @Column(name = "starts_at", nullable = false) private Instant startsAt;
    @Column(name = "ends_at", nullable = false) private Instant endsAt;
    @Column(name = "total_limit") private Integer totalLimit;
    @Column(name = "per_customer_limit") private Integer perCustomerLimit;
    @Column(name = "minimum_spend", nullable = false, precision = 12, scale = 2)
    private BigDecimal minimumSpend;
    @Column(name = "is_active", nullable = false) private boolean active = true;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    protected Promotion() {}

    Promotion(long salonId, String code, String normalized, PromotionDiscountType type,
              BigDecimal value, Instant startsAt, Instant endsAt, Integer totalLimit,
              Integer customerLimit, BigDecimal minimumSpend, boolean active) {
        this.salonId = salonId;
        update(code, normalized, type, value, startsAt, endsAt, totalLimit,
            customerLimit, minimumSpend, active);
    }
    void update(String code, String normalized, PromotionDiscountType type,
                BigDecimal value, Instant startsAt, Instant endsAt, Integer totalLimit,
                Integer customerLimit, BigDecimal minimumSpend, boolean active) {
        this.code = code;
        this.codeNormalized = normalized;
        this.discountType = type;
        this.discountValue = value;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.totalLimit = totalLimit;
        this.perCustomerLimit = customerLimit;
        this.minimumSpend = minimumSpend;
        this.active = active;
    }

    void deactivate() { active = false; }
    public Long getId() { return id; }
    public Long getSalonId() { return salonId; }
    public String getCode() { return code; }
    public String getCodeNormalized() { return codeNormalized; }
    public PromotionDiscountType getDiscountType() { return discountType; }
    public BigDecimal getDiscountValue() { return discountValue; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public Integer getTotalLimit() { return totalLimit; }
    public Integer getPerCustomerLimit() { return perCustomerLimit; }
    public BigDecimal getMinimumSpend() { return minimumSpend; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
