package com.hairsaloon.tenantdata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "media_assets")
class MediaAsset {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "salon_id", nullable = false)
    private Long salonId;
    @Column(name = "upload_id", nullable = false)
    private UUID uploadId;
    @Enumerated(EnumType.STRING)
    @Column(name = "media_type", nullable = false, length = 16)
    private MediaAssetType type;
    @Column(name = "object_key", nullable = false, unique = true, columnDefinition = "text")
    private String objectKey;
    @Column(name = "public_url", nullable = false, columnDefinition = "text")
    private String publicUrl;
    @Column(name = "content_type", nullable = false, length = 64)
    private String contentType;
    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;
    @Column(length = 255)
    private String etag;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected MediaAsset() {}

    MediaAsset(long salonId, UUID uploadId, MediaAssetType type, String objectKey,
               String publicUrl, String contentType, long sizeBytes, String etag) {
        this.salonId = salonId;
        this.uploadId = uploadId;
        this.type = type;
        this.objectKey = objectKey;
        this.publicUrl = publicUrl;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.etag = etag;
    }

    Long getId() { return id; }
    UUID getUploadId() { return uploadId; }
    MediaAssetType getType() { return type; }
    String getPublicUrl() { return publicUrl; }
    String getContentType() { return contentType; }
    long getSizeBytes() { return sizeBytes; }
    String getEtag() { return etag; }
    Instant getCreatedAt() { return createdAt; }
}