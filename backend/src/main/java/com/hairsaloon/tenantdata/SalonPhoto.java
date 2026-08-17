package com.hairsaloon.tenantdata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "salon_photos")
public class SalonPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "salon_id", nullable = false)
    private Long salonId;

    @Column(name = "photo_url", nullable = false, columnDefinition = "text")
    private String photoUrl;

    @Column(name = "alt_text", length = 255)
    private String altText;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected SalonPhoto() {
    }

    public SalonPhoto(long salonId, String photoUrl, int sortOrder) {
        this.salonId = salonId;
        this.photoUrl = photoUrl;
        this.sortOrder = sortOrder;
    }

    public Long getId() {
        return id;
    }

    public Long getSalonId() {
        return salonId;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public String getAltText() {
        return altText;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
