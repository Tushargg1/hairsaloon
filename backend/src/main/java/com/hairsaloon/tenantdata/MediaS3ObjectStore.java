package com.hairsaloon.tenantdata;

import com.hairsaloon.platform.PlatformApiException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

@Component
@ConditionalOnProperty(name = "media.storage-provider", havingValue = "s3")
class MediaS3ObjectStore implements MediaObjectStore {
    private final S3Client client;
    private final S3Presigner presigner;
    private final String bucket;

    MediaS3ObjectStore(S3Client client, S3Presigner presigner, MediaProperties properties) {
        this.client = client;
        this.presigner = presigner;
        this.bucket = properties.getS3().getBucket();
    }

    @Override
    public UploadTarget initiatePut(String key, String contentType, long sizeBytes,
                                    Map<String, String> metadata, Duration ttl) {
        try {
            PutObjectRequest put = PutObjectRequest.builder().bucket(bucket).key(key)
                .contentType(contentType).contentLength(sizeBytes).metadata(metadata).build();
            PresignedPutObjectRequest signed = presigner.presignPutObject(
                PutObjectPresignRequest.builder().signatureDuration(ttl)
                    .putObjectRequest(put).build());
            Map<String, String> headers = new LinkedHashMap<>();
            signed.signedHeaders().forEach((name, values) -> {
                if (!name.equalsIgnoreCase("host")) headers.put(name, String.join(",", values));
            });
            return new UploadTarget(signed.url().toURI(), Map.copyOf(headers));
        } catch (Exception exception) {
            throw storageFailure(exception);
        }
    }

    @Override
    public StoredObject head(String key) {
        try {
            HeadObjectResponse head = client.headObject(HeadObjectRequest.builder()
                .bucket(bucket).key(key).build());
            return new StoredObject(head.contentLength(), head.contentType(),
                head.metadata(), head.eTag());
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                throw new PlatformApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "MEDIA_UPLOAD_NOT_FOUND", "The uploaded object was not found");
            }
            throw storageFailure(exception);
        } catch (SdkException exception) {
            throw storageFailure(exception);
        }
    }

    private PlatformApiException storageFailure(Exception cause) {
        return new PlatformApiException(HttpStatus.BAD_GATEWAY, "MEDIA_STORAGE_ERROR",
            "Media object storage could not complete the request");
    }
}