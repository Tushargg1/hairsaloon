package com.hairsaloon.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public endpoint Meta calls for WhatsApp. GET answers the subscription
 * verification challenge; POST delivers inbound customer messages. Lives on the
 * platform host (no tenant), so it is reachable without a salon subdomain.
 */
@RestController
@RequestMapping("/api/whatsapp/webhook")
public class WhatsappWebhookController {

    private static final Logger log = LoggerFactory.getLogger(WhatsappWebhookController.class);

    private final WhatsappService service;
    private final WhatsappProperties properties;
    private final ObjectMapper mapper;

    public WhatsappWebhookController(WhatsappService service, WhatsappProperties properties,
                                     ObjectMapper mapper) {
        this.service = service;
        this.properties = properties;
        this.mapper = mapper;
    }

    /** Meta verifies the subscription by echoing hub.challenge when the token matches. */
    @GetMapping
    ResponseEntity<String> verify(
        @RequestParam(name = "hub.mode", required = false) String mode,
        @RequestParam(name = "hub.verify_token", required = false) String token,
        @RequestParam(name = "hub.challenge", required = false) String challenge) {
        String expected = properties.verifyToken();
        if ("subscribe".equals(mode) && expected != null && !expected.isBlank()
            && token != null && MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.ok(challenge);
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    /** Inbound messages/status updates. Always 200 so Meta does not retry endlessly. */
    @PostMapping
    ResponseEntity<Void> receive(@RequestBody(required = false) String body,
        @RequestHeader(name = "X-Hub-Signature-256", required = false) String signature) {
        if (body == null || body.isBlank()) return ResponseEntity.ok().build();
        // Verify Meta's HMAC-SHA256 body signature so nobody can forge inbound
        // messages for a salon's number. Enforced whenever an app secret is set.
        if (!validSignature(body, signature)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            JsonNode root = mapper.readTree(body);
            for (JsonNode entry : root.path("entry")) {
                for (JsonNode change : entry.path("changes")) {
                    JsonNode value = change.path("value");
                    String phoneNumberId = value.path("metadata").path("phone_number_id").asText(null);
                    if (phoneNumberId == null) continue;
                    for (JsonNode message : value.path("messages")) {
                        if (!"text".equals(message.path("type").asText())) continue;
                        String from = message.path("from").asText(null);
                        String text = message.path("text").path("body").asText("");
                        if (from != null) {
                            service.handleInboundMessage(phoneNumberId, from, text);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("WhatsApp webhook parse failed", e);
        }
        return ResponseEntity.ok().build();
    }

    /**
     * True when the request carries a valid {@code X-Hub-Signature-256} HMAC over the
     * raw body using the Meta app secret. If no app secret is configured, verification
     * is skipped (the feature is disabled); otherwise a missing/invalid signature is
     * rejected.
     */
    private boolean validSignature(String body, String signature) {
        String secret = properties.appSecret();
        if (secret == null || secret.isBlank()) return true; // WhatsApp not configured
        if (signature == null || !signature.startsWith("sha256=")) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) hex.append(String.format("%02x", b));
            String expected = "sha256=" + hex;
            return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.US_ASCII),
                signature.getBytes(StandardCharsets.US_ASCII));
        } catch (Exception e) {
            log.warn("WhatsApp webhook signature check failed", e);
            return false;
        }
    }
}
