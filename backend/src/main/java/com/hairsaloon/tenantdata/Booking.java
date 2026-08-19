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
import java.time.LocalDateTime;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "bookings")
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "salon_id", nullable = false)
    private Long salonId;
    @Column(name = "customer_id")
    private Long customerId;
    @Enumerated(EnumType.STRING)
    @Column(name = "booking_source", nullable = false, length = 16,
        columnDefinition = "varchar(16) default 'ONLINE'")
    private BookingSource bookingSource = BookingSource.ONLINE;
    @Column(name = "guest_name", length = 160)
    private String guestName;
    @Column(name = "guest_phone", length = 32)
    private String guestPhone;
    @Column(name = "staff_id", nullable = false)
    private Long staffId;
    @Column(name = "service_id", nullable = false)
    private Long serviceId;
    @Column(name = "start_datetime", nullable = false)
    private LocalDateTime startDateTime;
    @Column(name = "end_datetime", nullable = false)
    private LocalDateTime endDateTime;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private BookingStatus status = BookingStatus.CONFIRMED;
    @Column(name = "original_price", nullable = false, precision = 12, scale = 2,
        columnDefinition = "numeric(12,2) default 0")
    private BigDecimal originalPrice;
    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2,
        columnDefinition = "numeric(12,2) default 0")
    private BigDecimal discountAmount = BigDecimal.ZERO.setScale(2);
    @Column(name = "price_snapshot", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceSnapshot;
    @Column(name = "promo_code", length = 40)
    private String promoCode;
    @Column(name = "service_name_snapshot", nullable = false, length = 160)
    private String serviceNameSnapshot;
    @Column(name = "idempotency_key", length = 128)
    private String idempotencyKey;
    @Column(name = "reminder_24h_sent_at")
    private Instant reminder24hSentAt;
    @Column(name = "reminder_1h_sent_at")
    private Instant reminder1hSentAt;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    protected Booking() {}

    Booking(long salonId, Long customerId, long staffId, long serviceId,
            LocalDateTime startDateTime, LocalDateTime endDateTime,
            BigDecimal originalPrice, BigDecimal discountAmount, BigDecimal finalPrice,
            String promoCode, String serviceNameSnapshot, String idempotencyKey,
            BookingSource source, String guestName, String guestPhone) {
        this.salonId = salonId;
        this.customerId = customerId;
        this.staffId = staffId;
        this.serviceId = serviceId;
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.originalPrice = originalPrice;
        this.discountAmount = discountAmount;
        this.priceSnapshot = finalPrice;
        this.promoCode = promoCode;
        this.serviceNameSnapshot = serviceNameSnapshot;
        this.idempotencyKey = idempotencyKey;
        this.bookingSource = source;
        this.guestName = guestName;
        this.guestPhone = guestPhone;
        if (source == BookingSource.WALK_IN) {
            Instant suppressedAt = Instant.now();
            this.reminder24hSentAt = suppressedAt;
            this.reminder1hSentAt = suppressedAt;
        }
    }

    public Long getId() { return id; }
    public Long getCustomerId() { return customerId; }
    public BookingSource getBookingSource() { return bookingSource; }
    public String getGuestName() { return guestName; }
    public String getGuestPhone() { return guestPhone; }
    public Long getStaffId() { return staffId; }
    public Long getServiceId() { return serviceId; }
    public LocalDateTime getStartDateTime() { return startDateTime; }
    public LocalDateTime getEndDateTime() { return endDateTime; }
    public BookingStatus getStatus() { return status; }
    public BigDecimal getOriginalPrice() { return originalPrice; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public BigDecimal getPriceSnapshot() { return priceSnapshot; }
    public String getPromoCode() { return promoCode; }
    public String getServiceNameSnapshot() { return serviceNameSnapshot; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getCancelledAt() { return cancelledAt; }
}
