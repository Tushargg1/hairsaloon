package com.hairsaloon.tenantdata;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
@EnableConfigurationProperties(MediaProperties.class)
class MediaStorageConfiguration {
    @Bean
    @ConditionalOnProperty(name = "media.storage-provider", havingValue = "s3")
    S3Client mediaS3Client(MediaProperties properties) {
        validate(properties);
        return S3Client.builder().region(Region.of(properties.getS3().getRegion())).build();
    }

    @Bean
    @ConditionalOnProperty(name = "media.storage-provider", havingValue = "s3")
    S3Presigner mediaS3Presigner(MediaProperties properties) {
        validate(properties);
        return S3Presigner.builder().region(Region.of(properties.getS3().getRegion())).build();
    }

    private static void validate(MediaProperties properties) {
        if (properties.getS3().getBucket() == null || properties.getS3().getBucket().isBlank()
                || properties.getS3().getRegion() == null || properties.getS3().getRegion().isBlank()
                || properties.getCdnBaseUrl() == null || properties.getCdnBaseUrl().isBlank()) {
            throw new IllegalStateException(
                "S3 media storage requires bucket, region, and CDN base URL");
        }
    }
}