package com.hairsaloon.tenantdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.hairsaloon.platform.PlatformApiException;
import com.hairsaloon.tenant.TenantContext;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MediaServiceTest {
    private final MediaAssetRepository repository = mock(MediaAssetRepository.class);
    private final RecordingStore store = new RecordingStore();
    private final MediaProperties properties = new MediaProperties();
    private MediaService service;

    @BeforeEach
    void setUp() {
        TenantContext.setSalonId(42);
        properties.setCdnBaseUrl("https://media.example.com/");
        service = new MediaService(repository, store, properties,
            Clock.fixed(Instant.parse("2030-01-01T00:00:00Z"), ZoneOffset.UTC));
    }

    @AfterEach void clearTenant() { TenantContext.clear(); }

    @Test
    void initiationGeneratesScopedOpaqueKeyAndSignedVerificationMetadata() {
        MediaService.UploadInitiation result = service.initiate("gallery", "image/webp", 123L);

        assertThat(store.key).matches("salons/42/gallery/[0-9a-f-]{36}");
        assertThat(store.contentType).isEqualTo("image/webp");
        assertThat(store.size).isEqualTo(123);
        assertThat(store.metadata).containsEntry("salon-id", "42")
            .containsEntry("media-type", "GALLERY")
            .containsEntry("upload-id", result.uploadId().toString())
            .containsEntry("declared-size", "123")
            .containsEntry("declared-content-type", "image/webp");
        assertThat(result.expiresAt()).isEqualTo("2030-01-01T00:05:00Z");
    }

    @Test
    void initiationRejectsUnknownTypesMimesAndOversizeObjects() {
        assertThatThrownBy(() -> service.initiate("video", "image/png", 10L))
            .isInstanceOf(PlatformApiException.class);
        assertThatThrownBy(() -> service.initiate("logo", "image/gif", 10L))
            .isInstanceOf(PlatformApiException.class);
        assertThatThrownBy(() -> service.initiate("logo", "image/png", 5L * 1024 * 1024 + 1))
            .isInstanceOf(PlatformApiException.class);
    }

    @Test
    void confirmationHeadsAndPersistsOnlyAnExactlyMatchingObject() {
        UUID id = UUID.randomUUID();
        store.head = stored(id, 42, "LOGO", "image/png", 99);
        when(repository.findBySalonIdAndUploadId(42, id)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        MediaAsset asset = service.confirm("logo", id);

        assertThat(store.key).isEqualTo("salons/42/logo/" + id);
        assertThat(asset.getPublicUrl()).isEqualTo("https://media.example.com/salons/42/logo/" + id);
        assertThat(asset.getSizeBytes()).isEqualTo(99);
        verify(repository).save(any(MediaAsset.class));
    }

    @Test
    void confirmationRejectsMetadataMismatchBeforePersistence() {
        UUID id = UUID.randomUUID();
        store.head = stored(id, 7, "LOGO", "image/png", 99);
        when(repository.findBySalonIdAndUploadId(42, id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.confirm("logo", id))
            .isInstanceOf(PlatformApiException.class)
            .extracting(error -> ((PlatformApiException) error).code())
            .isEqualTo("MEDIA_UPLOAD_INVALID");
        verify(repository, never()).save(any());
    }

    private static MediaObjectStore.StoredObject stored(UUID id, long salonId, String type,
                                                          String mime, long size) {
        return new MediaObjectStore.StoredObject(size, mime, Map.of(
            "salon-id", Long.toString(salonId), "media-type", type,
            "upload-id", id.toString(), "declared-size", Long.toString(size),
            "declared-content-type", mime), "etag");
    }

    private static class RecordingStore implements MediaObjectStore {
        String key;
        String contentType;
        long size;
        Map<String, String> metadata;
        StoredObject head;

        @Override
        public UploadTarget initiatePut(String key, String contentType, long sizeBytes,
                                        Map<String, String> metadata, java.time.Duration ttl) {
            this.key = key;
            this.contentType = contentType;
            this.size = sizeBytes;
            this.metadata = metadata;
            return new UploadTarget(URI.create("https://s3.example.com/signed"),
                Map.of("content-type", contentType));
        }

        @Override public StoredObject head(String key) {
            this.key = key;
            return head;
        }
    }
}