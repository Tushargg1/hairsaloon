package com.hairsaloon.tenantdata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "salon_staff")
public class SalonStaff {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "salon_id", nullable = false)
    private Long salonId;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(name = "photo_url", columnDefinition = "text")
    private String photoUrl;
    @Column(name = "character_key", length = 40)
    private String characterKey;
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SalonStaff() {}

    public SalonStaff(long salonId, String name, String photoUrl, String characterKey) {
        this.salonId = salonId;
        update(name, photoUrl, characterKey);
    }

    public void update(String name, String photoUrl, String characterKey) {
        this.name = name;
        this.photoUrl = photoUrl;
        this.characterKey = characterKey;
    }

    public void setActive(boolean active) { this.active = active; }
    public void deactivate() { active = false; }

    public Long getId() { return id; }
    public Long getSalonId() { return salonId; }
    public String getName() { return name; }
    public String getPhotoUrl() { return photoUrl; }
    public String getCharacterKey() { return characterKey; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
