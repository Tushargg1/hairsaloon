package com.hairsaloon.google;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(GooglePlacesProperties.class)
class GooglePlacesConfiguration {
}
