package com.hairsaloon.tenantdata;

import com.hairsaloon.platform.PlatformApiException;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;

public enum MediaAssetType {
    LOGO(5L * 1024 * 1024),
    GALLERY(10L * 1024 * 1024),
    STAFF(5L * 1024 * 1024);

    private static final Set<String> IMAGE_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp");
    private final long maxSizeBytes;

    MediaAssetType(long maxSizeBytes) { this.maxSizeBytes = maxSizeBytes; }
    long maxSizeBytes() { return maxSizeBytes; }
    boolean allows(String contentType) { return IMAGE_TYPES.contains(contentType); }
    String keySegment() { return name().toLowerCase(Locale.ROOT); }

    static MediaAssetType parse(String value) {
        if (value == null || value.isBlank()) {
            throw invalid("type", "must be one of LOGO, GALLERY, STAFF");
        }
        try {
            return valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw invalid("type", "must be one of LOGO, GALLERY, STAFF");
        }
    }

    static PlatformApiException invalid(String field, String message) {
        return new PlatformApiException(HttpStatus.BAD_REQUEST, "MEDIA_VALIDATION_ERROR",
            "Media request is invalid", java.util.Map.of(field, message));
    }
}