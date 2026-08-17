package com.hairsaloon.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

final class LoggingEmailGateway implements EmailGateway {
    private static final Logger LOG = LoggerFactory.getLogger(LoggingEmailGateway.class);

    @Override
    public void send(EmailMessage message, String idempotencyKey) {
        // Deliberately omit recipient, subject, body, and event key from logs.
        LOG.info("Email delivery suppressed by logging provider");
    }
}
