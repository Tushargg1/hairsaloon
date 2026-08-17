package com.hairsaloon.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(NotificationProperties.class)
class EmailConfiguration {
    @Bean
    @ConditionalOnProperty(name = "app.notifications.provider", havingValue = "logging",
        matchIfMissing = true)
    EmailGateway loggingEmailGateway() {
        return new LoggingEmailGateway();
    }

    @Bean
    @ConditionalOnProperty(name = "app.notifications.provider", havingValue = "resend")
    EmailGateway resendEmailGateway(NotificationProperties properties, ObjectMapper mapper) {
        return new ResendEmailGateway(properties, mapper);
    }
}
