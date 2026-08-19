package com.hairsaloon.notification;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class PushProcessor {
    private static final Logger LOG = LoggerFactory.getLogger(PushProcessor.class);
    private final PushOutboxRepository outbox;
    private final PushSubscriptionService subscriptions;
    private final PushGateway gateway;
    private final PushProperties properties;

    PushProcessor(PushOutboxRepository outbox, PushSubscriptionService subscriptions,
            PushGateway gateway, PushProperties properties) {
        this.outbox = outbox;
        this.subscriptions = subscriptions;
        this.gateway = gateway;
        this.properties = properties;
    }

    public int processDueAt(Instant now) {
        String claimant = UUID.randomUUID().toString();
        var rows = outbox.claimPlatformBatch(claimant, now,
            now.plus(properties.getClaimDuration()), properties.getBatchSize(),
            properties.getMaxAttempts());
        for (var row : rows) process(row, claimant, now);
        return rows.size();
    }

    private void process(PushOutboxRepository.Delivery row, String claimant, Instant now) {
        try {
            PushGatewayResult result = gateway.send(row.message());
            if (result == null) {
                retry(row, claimant, now, "NULL_RESULT");
            } else if (result.removesSubscription()) {
                permanent(row, claimant, now, result);
            } else if (result.disposition() == PushGatewayResult.Disposition.SUCCESS) {
                outbox.markSent(row.salonId(), row.id(), claimant, Instant.now());
            } else if (result.disposition() == PushGatewayResult.Disposition.RETRY) {
                retry(row, claimant, now, failure(result));
            } else {
                permanent(row, claimant, now, result);
            }
        } catch (Exception failure) {
            retry(row, claimant, now, failure.getClass().getSimpleName());
            LOG.warn("Push delivery failed; outbox retry scheduled");
        }
    }
    private void permanent(PushOutboxRepository.Delivery row, String claimant, Instant now,
            PushGatewayResult result) {
        outbox.markPermanent(row.salonId(), row.id(), claimant, now, failure(result));
        if (result.removesSubscription() && row.subscriptionId() != null)
            subscriptions.removeGone(row.salonId(), row.subscriptionId());
    }

    private void retry(PushOutboxRepository.Delivery row, String claimant, Instant now,
            String failure) {
        if (row.attemptCount() >= properties.getMaxAttempts()) {
            outbox.markPermanent(row.salonId(), row.id(), claimant, now,
                "MAX_ATTEMPTS_" + failure);
            return;
        }
        outbox.markRetry(row.salonId(), row.id(), claimant,
            now.plus(backoff(row.attemptCount())), failure);
    }

    private Duration backoff(int attempt) {
        int exponent = Math.min(Math.max(attempt - 1, 0), 30);
        Duration delay = properties.getBaseRetryDelay().multipliedBy(1L << exponent);
        return delay.compareTo(properties.getMaxRetryDelay()) > 0
            ? properties.getMaxRetryDelay() : delay;
    }

    private static String failure(PushGatewayResult result) {
        return result.statusCode() == null ? result.disposition().name()
            : result.disposition().name() + "_HTTP_" + result.statusCode();
    }
}
