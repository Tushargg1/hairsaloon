package com.hairsaloon.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

final class ResendEmailGateway implements EmailGateway {
    private static final URI ENDPOINT = URI.create("https://api.resend.com/emails");
    private final String apiKey;
    private final String from;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10)).build();

    ResendEmailGateway(NotificationProperties properties, ObjectMapper mapper) {
        this.apiKey = required(properties.resendApiKey(), "RESEND_API_KEY");
        this.from = required(properties.from(), "EMAIL_FROM");
        this.mapper = mapper;
    }

    @Override
    public void send(EmailMessage message, String idempotencyKey) throws Exception {
        String json = mapper.writeValueAsString(Map.of("from", from,
            "to", new String[] {message.recipient()}, "subject", message.subject(),
            "text", message.body()));
        HttpRequest request = HttpRequest.newBuilder(ENDPOINT)
            .timeout(Duration.ofSeconds(20)).header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", idempotencyKey)
            .POST(HttpRequest.BodyPublishers.ofString(json)).build();
        int status = client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
        if (status < 200 || status >= 300)
            throw new IllegalStateException("Resend rejected email with HTTP " + status);
    }

    private static String required(String value, String environmentName) {
        if (value == null || value.isBlank())
            throw new IllegalStateException(environmentName + " is required for Resend");
        return value;
    }
}
