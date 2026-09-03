package com.hairsaloon.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
            && expected.equals(token)) {
            return ResponseEntity.ok(challenge);
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    /** Inbound messages/status updates. Always 200 so Meta does not retry endlessly. */
    @PostMapping
    ResponseEntity<Void> receive(@RequestBody(required = false) String body) {
        if (body == null || body.isBlank()) return ResponseEntity.ok().build();
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
}
