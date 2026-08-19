package com.hairsaloon.tenantdata;

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

@Entity
@Table(name = "promotion_redemptions")
public class PromotionRedemption {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "salon_id", nullable = false) private Long salonId;
    @Column(name = "promotion_id", nullable = false) private Long promotionId;
    @Column(name = "booking_id", nullable = false) private Long bookingId;
    @Column(name = "customer_id", nullable = false) private Long customerId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16)
    private PromotionRedemptionStatus status = PromotionRedemptionStatus.RESERVED;
    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountAmount;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "released_at") private Instant releasedAt;

    protected PromotionRedemption() {}

    PromotionRedemption(long salonId, long promotionId, long bookingId,
                        long customerId, BigDecimal discountAmount) {
        this.salonId = salonId;
        this.promotionId = promotionId;
        this.bookingId = bookingId;
        this.customerId = customerId;
        this.discountAmount = discountAmount;
    }
}
