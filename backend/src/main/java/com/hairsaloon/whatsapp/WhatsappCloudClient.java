package com.hairsaloon.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Thin wrapper over the Meta Graph API used for WhatsApp Embedded Signup and the
 * Cloud API. Uses the JDK HttpClient (same style as GooglePlacesClient) so it
 * needs no extra dependency.
 */
@Component
public class WhatsappCloudClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsappCloudClient.class);

    private final WhatsappProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10)).build();

    public WhatsappCloudClient(WhatsappProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
    }

    /** Exchanges the Embedded Signup auth code for a business access token. */
    public String exchangeCodeForToken(String code) {
        String url = properties.graphBaseUrlOrDefault() + "/oauth/access_token"
            + "?client_id=" + enc(properties.appId())
            + "&client_secret=" + enc(properties.appSecret())
            + "&code=" + enc(code);
        JsonNode body = get(url, null);
        String token = body == null ? null : body.path("access_token").asText(null);
        if (token == null || token.isBlank()) {
            throw new WhatsappException("Could not exchange the WhatsApp authorization code.");
        }
        return token;
    }

    /** First phone number under the WABA, with its id and display number. */
    public PhoneNumber firstPhoneNumber(String wabaId, String accessToken) {
        String url = properties.graphBaseUrlOrDefault() + "/" + enc(wabaId) + "/phone_numbers";
        JsonNode body = get(url, accessToken);
        JsonNode first = body == null ? null : body.path("data").path(0);
        if (first == null || first.isMissingNode() || first.path("id").asText(null) == null) {
            throw new WhatsappException("No WhatsApp phone number was found on the account.");
        }
        return new PhoneNumber(
            first.path("id").asText(null),
            first.path("display_phone_number").asText(null));
    }

    /**
     * Registers the number for Cloud API messaging. Required once after signup so
     * the number can send/receive through the Cloud API rather than the app.
     */
    public void registerPhoneNumber(String phoneNumberId, String accessToken) {
        // A random 6-digit PIN; two-step verification PIN for the registered number.
        String pin = String.format("%06d", (int) (Math.random() * 1_000_000));
        String payload = "{\"messaging_product\":\"whatsapp\",\"pin\":\"" + pin + "\"}";
        post(properties.graphBaseUrlOrDefault() + "/" + enc(phoneNumberId) + "/register",
            accessToken, payload, false);
    }

    /** Sends a plain text message to a recipient (E.164 without +). */
    public void sendText(String phoneNumberId, String accessToken, String toNumber, String text) {
        String payload = "{\"messaging_product\":\"whatsapp\",\"to\":\"" + jsonEscape(toNumber)
            + "\",\"type\":\"text\",\"text\":{\"body\":\"" + jsonEscape(text) + "\"}}";
        post(properties.graphBaseUrlOrDefault() + "/" + enc(phoneNumberId) + "/messages",
            accessToken, payload, true);
    }

    private JsonNode get(String url, String bearer) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(15)).GET();
            if (bearer != null) builder.header("Authorization", "Bearer " + bearer);
            HttpResponse<String> response = client.send(builder.build(),
                HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("WhatsApp GET {} failed: {}", url, response.statusCode());
                throw new WhatsappException("WhatsApp API request failed.");
            }
            return mapper.readTree(response.body());
        } catch (WhatsappException e) {
            throw e;
        } catch (Exception e) {
            throw new WhatsappException("WhatsApp API request failed.", e);
        }
    }

    private void post(String url, String bearer, String payload, boolean throwOnError) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + bearer)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload)).build();
            HttpResponse<String> response = client.send(request,
                HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("WhatsApp POST {} failed: {} {}", url, response.statusCode(), response.body());
                if (throwOnError) throw new WhatsappException("WhatsApp message send failed.");
            }
        } catch (WhatsappException e) {
            throw e;
        } catch (Exception e) {
            log.warn("WhatsApp POST {} errored", url, e);
            if (throwOnError) throw new WhatsappException("WhatsApp message send failed.", e);
        }
    }

    private static String enc(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static String jsonEscape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"")
            .replace("\n", "\\n").replace("\r", "").replace("\t", "\\t");
    }

    public record PhoneNumber(String id, String displayNumber) {}
}
