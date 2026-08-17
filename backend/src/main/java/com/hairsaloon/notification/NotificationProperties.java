package com.hairsaloon.notification;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.notifications")
public record NotificationProperties(
        String provider,
        String from,
        String resendApiKey,
        int batchSize,
        int maxAttempts,
        Duration claimDuration,
        Duration baseRetryDelay,
        Duration maxRetryDelay) {
}
