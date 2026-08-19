package com.hairsaloon.tenantdata;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

interface MediaAssetRepository extends TenantScopedRepository<MediaAsset> {
    List<MediaAsset> findAllBySalonIdOrderByCreatedAtDescIdDesc(long salonId);
    Optional<MediaAsset> findBySalonIdAndUploadId(long salonId, UUID uploadId);
    MediaAsset save(MediaAsset asset);
}