package com.hairsaloon.whatsapp;

import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import com.hairsaloon.tenant.TenantContext;
import com.hairsaloon.tenant.TenantProperties;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Owner-facing WhatsApp actions (connect via Embedded Signup, disconnect, bot
 * toggle) and the inbound-message auto-reply. The reply is intentionally simple:
 * a greeting plus the salon's public booking link, sent only when the bot is on.
 */
@Service
public class WhatsappService {

    private static final Logger log = LoggerFactory.getLogger(WhatsappService.class);

    private final SalonRepository salons;
    private final WhatsappCloudClient cloud;
    private final WhatsappProperties properties;
    private final TenantProperties tenant;

    public WhatsappService(SalonRepository salons, WhatsappCloudClient cloud,
                           WhatsappProperties properties, TenantProperties tenant) {
        this.salons = salons;
        this.cloud = cloud;
        this.properties = properties;
        this.tenant = tenant;
    }

    @Transactional(readOnly = true)
    public Status status(AuthenticatedUser user) {
        return toStatus(ownedSalon(user));
    }

    /**
     * Completes Embedded Signup: exchanges the auth code for a token, resolves the
     * phone number under the given WABA, registers it for Cloud API messaging and
     * stores the connection on the salon.
     */
    @Transactional
    public Status connect(AuthenticatedUser user, String code, String wabaId) {
        if (!properties.enabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "WhatsApp is not configured on the server.");
        }
        if (code == null || code.isBlank() || wabaId == null || wabaId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Missing WhatsApp authorization details.");
        }
        Salon salon = ownedSalon(user);
        String token = cloud.exchangeCodeForToken(code.trim());
        WhatsappCloudClient.PhoneNumber phone = cloud.firstPhoneNumber(wabaId.trim(), token);
        try {
            cloud.registerPhoneNumber(phone.id(), token);
        } catch (WhatsappException e) {
            // Some numbers are already registered; that is not fatal for messaging.
            log.info("WhatsApp number {} register skipped: {}", phone.id(), e.getMessage());
        }
        salon.connectWhatsapp(phone.id(), wabaId.trim(), phone.displayNumber(), token, Instant.now());
        salons.save(salon);
        return toStatus(salon);
    }

    @Transactional
    public Status disconnect(AuthenticatedUser user) {
        Salon salon = ownedSalon(user);
        salon.disconnectWhatsapp();
        salons.save(salon);
        return toStatus(salon);
    }

    @Transactional
    public Status setBotEnabled(AuthenticatedUser user, boolean enabled) {
        Salon salon = ownedSalon(user);
        salon.setWhatsappBotEnabled(enabled);
        salons.save(salon);
        return toStatus(salon);
    }

    /** Handles one inbound customer message: auto-replies if the salon's bot is on. */
    @Transactional(readOnly = true)
    public void handleInboundMessage(String phoneNumberId, String fromNumber, String text) {
        salons.findByWhatsappPhoneNumberId(phoneNumberId).ifPresent(salon -> {
            if (!salon.isWhatsappConnected() || !salon.isWhatsappBotEnabled()) return;
            try {
                cloud.sendText(salon.getWhatsappPhoneNumberId(), salon.getWhatsappAccessToken(),
                    fromNumber, autoReply(salon, text));
            } catch (WhatsappException e) {
                log.warn("WhatsApp auto-reply failed for salon {}", salon.getId(), e);
            }
        });
    }

    private String autoReply(Salon salon, String incoming) {
        String bookingUrl = "https://" + salon.getSubdomain() + "." + tenant.getBaseDomain();
        return "Hi! Thanks for messaging " + salon.getName() + ". "
            + "You can view services and book an appointment here: " + bookingUrl + " . "
            + "Reply here and our team will get back to you shortly.";
    }

    private Salon ownedSalon(AuthenticatedUser user) {
        long salonId = TenantContext.requireSalonId();
        Salon salon = salons.findById(salonId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Salon was not found"));
        if (user == null || !salon.getOwnerId().equals(user.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You do not own the current salon");
        }
        return salon;
    }

    private Status toStatus(Salon salon) {
        return new Status(salon.isWhatsappConnected(), salon.getWhatsappDisplayNumber(),
            salon.isWhatsappBotEnabled(), properties.configId(), properties.appId(),
            properties.enabled());
    }

    public record Status(boolean connected, String displayNumber, boolean botEnabled,
                         String configId, String appId, boolean available) {}
}
