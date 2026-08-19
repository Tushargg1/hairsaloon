package com.hairsaloon.tenantdata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hairsaloon.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class MediaController {
    private final SalonOwnershipVerifier ownership;
    private final MediaService service;

    MediaController(SalonOwnershipVerifier ownership, MediaService service) {
        this.ownership = ownership;
        this.service = service;
    }

    @PostMapping("/api/salon/dashboard/media/uploads")
    UploadResponse initiate(@AuthenticationPrincipal AuthenticatedUser user,
                            @Valid @RequestBody InitiateRequest request) {
        ownership.verifyOwner(user);
        MediaService.UploadInitiation result = service.initiate(
            request.type(), request.contentType(), request.sizeBytes());
        return new UploadResponse(result.uploadId(), result.type(), result.uploadUrl(),
            "PUT", result.requiredHeaders(), result.expiresAt());
    }

    @PostMapping("/api/salon/dashboard/media/uploads/{type}/{uploadId}/confirm")
    @ResponseStatus(HttpStatus.CREATED)
    AssetResponse confirm(@AuthenticationPrincipal AuthenticatedUser user,
                          @PathVariable String type, @PathVariable UUID uploadId) {
        ownership.verifyOwner(user);
        return response(service.confirm(type, uploadId));
    }

    @GetMapping("/api/salon/dashboard/media")
    List<AssetResponse> ownerList(@AuthenticationPrincipal AuthenticatedUser user) {
        ownership.verifyOwner(user);
        return service.list().stream().map(MediaController::response).toList();
    }

    @GetMapping("/api/salon/media")
    List<AssetResponse> publicList() {
        return service.list().stream().map(MediaController::response).toList();
    }

    private static AssetResponse response(MediaAsset asset) {
        return new AssetResponse(asset.getUploadId(), asset.getType(), asset.getPublicUrl(),
            asset.getContentType(), asset.getSizeBytes(), asset.getEtag(), asset.getCreatedAt());
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record InitiateRequest(@NotBlank String type, @NotBlank String contentType,
                           @NotNull @Positive Long sizeBytes) {}
    record UploadResponse(UUID uploadId, MediaAssetType type, URI uploadUrl, String method,
                          Map<String, String> requiredHeaders, Instant expiresAt) {}
    record AssetResponse(UUID id, MediaAssetType type, String url, String contentType,
                         long sizeBytes, String etag, Instant createdAt) {}
}