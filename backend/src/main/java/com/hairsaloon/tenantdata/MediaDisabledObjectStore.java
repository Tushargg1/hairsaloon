package com.hairsaloon.tenantdata;

import com.hairsaloon.platform.PlatformApiException;
import java.time.Duration;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "media.storage-provider", havingValue = "disabled",
    matchIfMissing = true)
class MediaDisabledObjectStore implements MediaObjectStore {
    private PlatformApiException disabled() {
        return new PlatformApiException(HttpStatus.SERVICE_UNAVAILABLE,
            "MEDIA_STORAGE_DISABLED", "Media storage is disabled");
    }
    @Override
    public UploadTarget initiatePut(String key, String contentType, long sizeBytes,
                                    Map<String, String> metadata, Duration ttl) {
        throw disabled();
    }
    @Override public StoredObject head(String key) { throw disabled(); }
}