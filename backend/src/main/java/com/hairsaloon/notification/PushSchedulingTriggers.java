package com.hairsaloon.notification;

import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.push.enabled", havingValue = "true")
class PushSchedulingTriggers {
    private final PushProcessor processor;

    PushSchedulingTriggers(PushProcessor processor) {
        this.processor = processor;
    }

    @Scheduled(fixedDelayString = "${app.push.process-delay-ms:5000}")
    void processOutbox() {
        processor.processDueAt(Instant.now());
    }
}
