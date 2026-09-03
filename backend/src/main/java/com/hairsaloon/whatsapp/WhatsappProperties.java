package com.hairsaloon.whatsapp;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.whatsapp")
public record WhatsappProperties(
    String appId,
    String appSecret,
    String configId,
    String verifyToken,
    String graphBaseUrl
) {

    public boolean enabled() {
        return appId != null && !appId.isBlank()
            && appSecret != null && !appSecret.isBlank();
    }

    public String graphBaseUrlOrDefault() {
        return graphBaseUrl == null || graphBaseUrl.isBlank()
            ? "https://graph.facebook.com/v21.0"
            : graphBaseUrl.trim();
    }
}
