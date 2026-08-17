package com.hairsaloon.tenantdata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDateTime;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "staff_time_off")
public class StaffTimeOff {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "salon_id", nullable = false)
    private Long salonId;
    @Column(name = "staff_id", nullable = false)
    private Long staffId;
    @Column(name = "start_datetime", nullable = false)
    private LocalDateTime startDateTime;
    @Column(name = "end_datetime", nullable = false)
    private LocalDateTime endDateTime;
    @Column(length = 255)
    private String reason;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected StaffTimeOff() {}

    public StaffTimeOff(long salonId, long staffId, LocalDateTime startDateTime,
                        LocalDateTime endDateTime, String reason) {
        this.salonId = salonId;
        this.staffId = staffId;
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.reason = reason;
    }

    public Long getId() { return id; }
    public LocalDateTime getStartDateTime() { return startDateTime; }
    public LocalDateTime getEndDateTime() { return endDateTime; }
    public String getReason() { return reason; }
    public Instant getCreatedAt() { return createdAt; }
}
