package com.hairsaloon.notification;

import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.notifications.scheduling-enabled", havingValue = "true",
    matchIfMissing = true)
class NotificationSchedulingTriggers {
    private final ReminderEnqueuer reminders;
    private final NotificationProcessor processor;

    NotificationSchedulingTriggers(ReminderEnqueuer reminders,
                                   NotificationProcessor processor) {
        this.reminders = reminders;
        this.processor = processor;
    }

    @Scheduled(fixedDelayString = "${app.notifications.reminder-scan-delay-ms:60000}")
    void enqueueReminders() { reminders.enqueueDueAt(Instant.now()); }

    @Scheduled(fixedDelayString = "${app.notifications.process-delay-ms:5000}")
    void processOutbox() { processor.processDueAt(Instant.now()); }
}
