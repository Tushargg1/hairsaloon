package com.hairsaloon.tenantdata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "services")
public class SalonServiceEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "salon_id", nullable = false)
    private Long salonId;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;
    @Column(length = 120)
    private String category;
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SalonServiceEntity() {}

    public SalonServiceEntity(long salonId, String name, int durationMinutes,
                              BigDecimal price, String category) {
        this.salonId = salonId;
        update(name, durationMinutes, price, category);
    }

    public void update(String name, int durationMinutes, BigDecimal price, String category) {
        this.name = name;
        this.durationMinutes = durationMinutes;
        this.price = price;
        this.category = category;
    }

    public void setActive(boolean active) { this.active = active; }
    public void deactivate() { active = false; }
    public Long getId() { return id; }
    public Long getSalonId() { return salonId; }
    public String getName() { return name; }
    public int getDurationMinutes() { return durationMinutes; }
    public BigDecimal getPrice() { return price; }
    public String getCategory() { return category; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
