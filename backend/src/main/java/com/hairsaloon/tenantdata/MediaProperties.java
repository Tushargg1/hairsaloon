package com.hairsaloon.tenantdata;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("media")
public class MediaProperties {
    public enum StorageProvider { DISABLED, S3 }

    private StorageProvider storageProvider = StorageProvider.DISABLED;
    private String objectPrefix = "salons";
    private String cdnBaseUrl = "";
    private Duration presignTtl = Duration.ofMinutes(5);
    private final S3 s3 = new S3();

    public StorageProvider getStorageProvider() { return storageProvider; }
    public void setStorageProvider(StorageProvider value) { this.storageProvider = value; }
    public String getObjectPrefix() { return objectPrefix; }
    public void setObjectPrefix(String value) { this.objectPrefix = value; }
    public String getCdnBaseUrl() { return cdnBaseUrl; }
    public void setCdnBaseUrl(String value) { this.cdnBaseUrl = value; }
    public Duration getPresignTtl() { return presignTtl; }
    public void setPresignTtl(Duration value) { this.presignTtl = value; }
    public S3 getS3() { return s3; }

    public static class S3 {
        private String bucket = "";
        private String region = "us-east-1";

        public String getBucket() { return bucket; }
        public void setBucket(String value) { this.bucket = value; }
        public String getRegion() { return region; }
        public void setRegion(String value) { this.region = value; }
    }
}