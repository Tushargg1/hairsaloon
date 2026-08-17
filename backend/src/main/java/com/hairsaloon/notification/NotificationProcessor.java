package com.hairsaloon.notification;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class NotificationProcessor {
    private static final Logger LOG = LoggerFactory.getLogger(NotificationProcessor.class);
    private final NotificationOutboxRepository outbox;
    private final EmailGateway gateway;
    private final NotificationProperties properties;

    NotificationProcessor(NotificationOutboxRepository outbox, EmailGateway gateway,
                          NotificationProperties properties) {
        this.outbox = outbox;
        this.gateway = gateway;
        this.properties = properties;
    }

    public int processDueAt(Instant now) {
        String claimant = UUID.randomUUID().toString();
        var rows = outbox.claimPlatformBatch(claimant, now,
            now.plus(properties.claimDuration()), properties.batchSize(),
            properties.maxAttempts());
        for (var row : rows) {
            try {
                gateway.send(new EmailMessage(row.recipient(), row.subject(), row.body()),
                    row.eventKey());
                outbox.markSent(row.salonId(), row.id(), claimant, Instant.now());
            } catch (Exception failure) {
                Instant retry = now.plus(backoff(row.attemptCount()));
                outbox.markFailed(row.salonId(), row.id(), claimant, retry,
                    failure.getClass().getSimpleName());
                LOG.warn("Email delivery failed; outbox retry scheduled");
            }
        }
        return rows.size();
    }

    private Duration backoff(int attempt) {
        int exponent = Math.min(Math.max(attempt - 1, 0), 30);
        Duration delay = properties.baseRetryDelay().multipliedBy(1L << exponent);
        return delay.compareTo(properties.maxRetryDelay()) > 0
            ? properties.maxRetryDelay() : delay;
    }
}
