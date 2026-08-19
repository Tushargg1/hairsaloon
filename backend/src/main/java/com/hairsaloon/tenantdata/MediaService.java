package com.hairsaloon.tenantdata;

import com.hairsaloon.platform.PlatformApiException;
import com.hairsaloon.tenant.TenantContext;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class MediaService {
    private static final Duration MAX_PRESIGN_TTL = Duration.ofMinutes(15);
    private final MediaAssetRepository repository;
    private final MediaObjectStore objectStore;
    private final MediaProperties properties;
    private final Clock clock;

    MediaService(MediaAssetRepository repository, MediaObjectStore objectStore,
                 MediaProperties properties, Clock clock) {
        this.repository = repository;
        this.objectStore = objectStore;
        this.properties = properties;
        this.clock = clock;
    }

    UploadInitiation initiate(String typeValue, String contentType, Long sizeBytes) {
        long salonId = TenantContext.requireSalonId();
        MediaAssetType type = MediaAssetType.parse(typeValue);
        validate(type, contentType, sizeBytes);
        Duration ttl = properties.getPresignTtl();
        if (ttl == null || ttl.isZero() || ttl.isNegative() || ttl.compareTo(MAX_PRESIGN_TTL) > 0) {
            throw new IllegalStateException("media.presign-ttl must be between 1ms and 15m");
        }
        UUID uploadId = UUID.randomUUID();
        String key = key(properties.getObjectPrefix(), salonId, type, uploadId);
        Map<String, String> metadata = Map.of(
            "salon-id", Long.toString(salonId),
            "media-type", type.name(),
            "upload-id", uploadId.toString(),
            "declared-size", Long.toString(sizeBytes),
            "declared-content-type", contentType);
        MediaObjectStore.UploadTarget target = objectStore.initiatePut(
            key, contentType, sizeBytes, metadata, ttl);
        return new UploadInitiation(uploadId, type, target.url(), target.requiredHeaders(),
            clock.instant().plus(ttl));
    }

    @Transactional
    MediaAsset confirm(String typeValue, UUID uploadId) {
        long salonId = TenantContext.requireSalonId();
        MediaAssetType type = MediaAssetType.parse(typeValue);
        return repository.findBySalonIdAndUploadId(salonId, uploadId).map(existing -> {
            if (existing.getType() != type) {
                throw new PlatformApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "MEDIA_UPLOAD_INVALID", "Upload identifier does not match media type");
            }
            return existing;
        }).orElseGet(() -> {
            String key = key(properties.getObjectPrefix(), salonId, type, uploadId);
            MediaObjectStore.StoredObject object = objectStore.head(key);
            verifyObject(object, salonId, type, uploadId);
            return repository.save(new MediaAsset(salonId, uploadId, type, key,
                publicUrl(key), object.contentType(), object.sizeBytes(), object.eTag()));
        });
    }

    @Transactional(readOnly = true)
    List<MediaAsset> list() {
        return repository.findAllBySalonIdOrderByCreatedAtDescIdDesc(
            TenantContext.requireSalonId());
    }

    private void verifyObject(MediaObjectStore.StoredObject object, long salonId,
                              MediaAssetType type, UUID uploadId) {
        Map<String, String> metadata = object.metadata();
        String declaredSize = metadata.get("declared-size");
        String declaredType = metadata.get("declared-content-type");
        boolean valid = Long.toString(salonId).equals(metadata.get("salon-id"))
            && type.name().equals(metadata.get("media-type"))
            && uploadId.toString().equals(metadata.get("upload-id"))
            && Long.toString(object.sizeBytes()).equals(declaredSize)
            && object.contentType() != null && object.contentType().equals(declaredType)
            && object.sizeBytes() > 0 && object.sizeBytes() <= type.maxSizeBytes()
            && type.allows(object.contentType());
        if (!valid) {
            throw new PlatformApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                "MEDIA_UPLOAD_INVALID",
                "Uploaded object metadata, size, or content type did not match initiation");
        }
    }

    private void validate(MediaAssetType type, String contentType, Long sizeBytes) {
        if (contentType == null || !type.allows(contentType)) {
            throw MediaAssetType.invalid("contentType",
                "must be image/jpeg, image/png, or image/webp");
        }
        if (sizeBytes == null || sizeBytes <= 0 || sizeBytes > type.maxSizeBytes()) {
            throw MediaAssetType.invalid("sizeBytes",
                "must be positive and no greater than " + type.maxSizeBytes());
        }
    }

    private String publicUrl(String key) {
        String base = properties.getCdnBaseUrl();
        try {
            URI uri = URI.create(base == null ? "" : base);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) throw new Exception();
            return base.replaceAll("/+$", "") + "/" + key;
        } catch (Exception exception) {
            throw new IllegalStateException("media.cdn-base-url must be an absolute HTTPS URL");
        }
    }

    static String key(long salonId, MediaAssetType type, UUID uploadId) {
        return key("salons", salonId, type, uploadId);
    }

    static String key(String prefix, long salonId, MediaAssetType type, UUID uploadId) {
        String normalized = prefix == null ? "" : prefix.trim();
        if (!normalized.matches("[a-z0-9](?:[a-z0-9/_-]*[a-z0-9])?")
                || normalized.contains("//")) {
            throw new IllegalStateException("media.object-prefix must be a safe relative key prefix");
        }
        return normalized + "/" + salonId + "/" + type.keySegment() + "/" + uploadId;
    }

    record UploadInitiation(UUID uploadId, MediaAssetType type, URI uploadUrl,
                            Map<String, String> requiredHeaders, Instant expiresAt) {}
}