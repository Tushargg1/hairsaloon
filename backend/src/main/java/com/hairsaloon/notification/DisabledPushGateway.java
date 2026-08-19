package com.hairsaloon.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

final class DisabledPushGateway implements PushGateway {
    private static final Logger LOG = LoggerFactory.getLogger(DisabledPushGateway.class);

    @Override
    public PushGatewayResult send(PushMessage message) {
        // Never log endpoint, keys, payload, recipient, or idempotency key.
        LOG.info("Push delivery suppressed by disabled provider");
        return PushGatewayResult.success();
    }
}
