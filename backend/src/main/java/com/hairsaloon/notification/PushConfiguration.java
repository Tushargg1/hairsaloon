package com.hairsaloon.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(PushProperties.class)
class PushConfiguration {
    @Bean
    @ConditionalOnProperty(name = "app.push.provider", havingValue = "disabled",
        matchIfMissing = true)
    PushGateway disabledPushGateway() {
        return new DisabledPushGateway();
    }
}
