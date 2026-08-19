package com.hairsaloon.tenantdata;

import java.net.URI;
import java.time.Duration;
import java.util.Map;

interface MediaObjectStore {
    UploadTarget initiatePut(String key, String contentType, long sizeBytes,
                             Map<String, String> metadata, Duration ttl);
    StoredObject head(String key);

    record UploadTarget(URI url, Map<String, String> requiredHeaders) {}
    record StoredObject(long sizeBytes, String contentType, Map<String, String> metadata,
                        String eTag) {}
}