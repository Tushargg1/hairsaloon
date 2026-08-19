package com.hairsaloon.notification;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.push")
public class PushProperties {
    private boolean enabled = false;
    private String provider = "disabled";
    private int batchSize = 25;
    private int maxAttempts = 8;
    private Duration claimDuration = Duration.ofMinutes(2);
    private Duration baseRetryDelay = Duration.ofSeconds(30);
    private Duration maxRetryDelay = Duration.ofMinutes(30);
    private String vapidPublicKey = "";
    private String vapidPrivateKey = "";
    private String vapidSubject = "";

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public int getBatchSize() { return batchSize; }
    public void setBatchSize(int batchSize) { this.batchSize = batchSize; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
    public Duration getClaimDuration() { return claimDuration; }
    public void setClaimDuration(Duration value) { claimDuration = value; }
    public Duration getBaseRetryDelay() { return baseRetryDelay; }
    public void setBaseRetryDelay(Duration value) { baseRetryDelay = value; }
    public Duration getMaxRetryDelay() { return maxRetryDelay; }
    public void setMaxRetryDelay(Duration value) { maxRetryDelay = value; }
    public String getVapidPublicKey() { return vapidPublicKey; }
    public void setVapidPublicKey(String value) { vapidPublicKey = value; }
    public String getVapidPrivateKey() { return vapidPrivateKey; }
    public void setVapidPrivateKey(String value) { vapidPrivateKey = value; }
    public String getVapidSubject() { return vapidSubject; }
    public void setVapidSubject(String value) { vapidSubject = value; }
}
