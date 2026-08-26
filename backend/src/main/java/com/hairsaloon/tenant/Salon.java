package com.hairsaloon.tenant;

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
import java.util.Arrays;
import java.util.List;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "salons", uniqueConstraints = {
    @UniqueConstraint(name = "uq_salons_owner_id", columnNames = "owner_id")
})
public class Salon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false, unique = true)
    private Long ownerId;

    @Column(nullable = false, unique = true, length = 30)
    private String subdomain;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    @Column(nullable = false, length = 120)
    private String city;

    @Column(length = 32)
    private String phone;

    @Column(length = 320)
    private String email;
    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "instagram_url", columnDefinition = "TEXT")
    private String instagramUrl;

    @Column(name = "facebook_url", columnDefinition = "TEXT")
    private String facebookUrl;

    @Column(name = "whatsapp_url", columnDefinition = "TEXT")
    private String whatsappUrl;

    @Column(name = "youtube_url", columnDefinition = "TEXT")
    private String youtubeUrl;

    @Column(name = "maps_url", columnDefinition = "TEXT")
    private String mapsUrl;

    @Column(name = "category_order", columnDefinition = "TEXT")
    private String categoryOrder;

    @Column(nullable = false, length = 64)
    private String timezone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SalonStatus status;

    @Column(name = "cancellation_window_minutes", nullable = false)
    private int cancellationWindowMinutes = 120;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Salon() {
    }

    public Salon(Long ownerId, String subdomain, String name, String description,
                 String address, String city, String phone, String email,
                 String logoUrl, String timezone) {
        this(ownerId, subdomain, name, description, address, city, phone, email,
            logoUrl, timezone, null, null);
    }

    public Salon(Long ownerId, String subdomain, String name, String description,
                 String address, String city, String phone, String email,
                 String logoUrl, String timezone, BigDecimal latitude,
                 BigDecimal longitude) {
        this.ownerId = ownerId;
        this.subdomain = subdomain;
        this.name = name;
        this.description = description;
        this.address = address;
        this.city = city;
        this.phone = phone;
        this.email = email;
        this.logoUrl = logoUrl;
        this.timezone = timezone;
        this.latitude = latitude;
        this.longitude = longitude;
        this.status = SalonStatus.PENDING;
    }

    public void approve() {
        status = SalonStatus.ACTIVE;
    }

    public void updateProfile(String name, String description, String address, String city,
                              String phone, String email, String logoUrl, String timezone,
                              int cancellationWindowMinutes) {
        this.name = name;
        this.description = description;
        this.address = address;
        this.city = city;
        this.phone = phone;
        this.email = email;
        this.logoUrl = logoUrl;
        this.timezone = timezone;
        this.cancellationWindowMinutes = cancellationWindowMinutes;
    }

    public void updateSocialLinks(String instagramUrl, String facebookUrl, String whatsappUrl,
                                  String youtubeUrl, String mapsUrl) {
        this.instagramUrl = instagramUrl;
        this.facebookUrl = facebookUrl;
        this.whatsappUrl = whatsappUrl;
        this.youtubeUrl = youtubeUrl;
        this.mapsUrl = mapsUrl;
    }

    /** Display order for price-list categories, one name per line. */
    public void updateCategoryOrder(List<String> categories) {
        categoryOrder = categories == null || categories.isEmpty()
            ? null : String.join("\n", categories);
    }

    public List<String> getCategoryOrder() {
        if (categoryOrder == null || categoryOrder.isBlank()) return List.of();
        return Arrays.stream(categoryOrder.split("\n")).map(String::trim)
            .filter(value -> !value.isEmpty()).toList();
    }

    public Long getId() { return id; }
    public Long getOwnerId() { return ownerId; }
    public String getSubdomain() { return subdomain; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getAddress() { return address; }
    public String getCity() { return city; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getLogoUrl() { return logoUrl; }
    public String getInstagramUrl() { return instagramUrl; }
    public String getFacebookUrl() { return facebookUrl; }
    public String getWhatsappUrl() { return whatsappUrl; }
    public String getYoutubeUrl() { return youtubeUrl; }
    public String getMapsUrl() { return mapsUrl; }
    public String getTimezone() { return timezone; }
    public SalonStatus getStatus() { return status; }
    public int getCancellationWindowMinutes() { return cancellationWindowMinutes; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public Instant getCreatedAt() { return createdAt; }

}
