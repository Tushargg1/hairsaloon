package com.hairsaloon.google;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.google-places")
public record GooglePlacesProperties(String apiKey, int monthlyCap) {

    public boolean enabled() {
        return apiKey != null && !apiKey.isBlank();
    }
}
