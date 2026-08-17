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
    @Column(name = "customer_id", nullable = false)
    private Long customerId;
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
    @Column(name = "price_snapshot", nullable = false, precision = 12, scale = 2)
    private BigDecimal priceSnapshot;
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

    Booking(long salonId, long customerId, long staffId, long serviceId,
            LocalDateTime startDateTime, LocalDateTime endDateTime,
            BigDecimal priceSnapshot, String serviceNameSnapshot,
            String idempotencyKey) {
        this.salonId = salonId;
        this.customerId = customerId;
        this.staffId = staffId;
        this.serviceId = serviceId;
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.priceSnapshot = priceSnapshot;
        this.serviceNameSnapshot = serviceNameSnapshot;
        this.idempotencyKey = idempotencyKey;
    }

    public Long getId() { return id; }
    public Long getCustomerId() { return customerId; }
    public Long getStaffId() { return staffId; }
    public Long getServiceId() { return serviceId; }
    public LocalDateTime getStartDateTime() { return startDateTime; }
    public LocalDateTime getEndDateTime() { return endDateTime; }
    public BookingStatus getStatus() { return status; }
    public BigDecimal getPriceSnapshot() { return priceSnapshot; }
    public String getServiceNameSnapshot() { return serviceNameSnapshot; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getCancelledAt() { return cancelledAt; }
}
