package com.hairsaloon.notification;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PushSubscriptionService {
    private final JdbcTemplate jdbc;

    public PushSubscriptionService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public void subscribe(long salonId, long userId, PushSubscriptionAudience audience,
            String endpoint, String p256dh, String auth) {
        endpoint = validEndpoint(endpoint);
        p256dh = validKey(p256dh, 43, 512, "p256dh");
        auth = validKey(auth, 16, 255, "auth");
        String hash = hash(endpoint);
        Instant now = Instant.now();
        int updated = jdbc.update("UPDATE push_subscriptions SET p256dh=?,auth=?,updated_at=? "
                + "WHERE salon_id=? AND user_id=? AND audience=? AND endpoint_hash=?",
            p256dh, auth, now, salonId, userId, audience.name(), hash);
        if (updated == 0) insert(salonId, userId, audience, endpoint, hash, p256dh, auth, now);
    }

    private void insert(long salonId, long userId, PushSubscriptionAudience audience,
            String endpoint, String hash, String p256dh, String auth, Instant now) {
        try {
            jdbc.update("INSERT INTO push_subscriptions (salon_id,user_id,audience,endpoint,"
                    + "endpoint_hash,p256dh,auth,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                salonId, userId, audience.name(), endpoint, hash, p256dh, auth, now, now);
        } catch (DataIntegrityViolationException raced) {
            jdbc.update("UPDATE push_subscriptions SET p256dh=?,auth=?,updated_at=? WHERE "
                    + "salon_id=? AND user_id=? AND audience=? AND endpoint_hash=?",
                p256dh, auth, now, salonId, userId, audience.name(), hash);
        }
    }
    @Transactional
    public boolean unsubscribe(long salonId, long userId, PushSubscriptionAudience audience,
            String endpoint) {
        endpoint = validEndpoint(endpoint);
        String endpointHash = hash(endpoint);
        discardPending(salonId, userId, audience, endpointHash, "UNSUBSCRIBED");
        return jdbc.update("DELETE FROM push_subscriptions WHERE salon_id=? AND user_id=? "
                + "AND audience=? AND endpoint_hash=?",
            salonId, userId, audience.name(), endpointHash) > 0;
    }

    @Transactional
    void removeGone(long salonId, long subscriptionId) {
        jdbc.update("UPDATE push_outbox SET discarded_at=?,last_error='ENDPOINT_GONE',"
                + "claimed_by=NULL,claimed_until=NULL WHERE salon_id=? AND subscription_id=? "
                + "AND sent_at IS NULL AND discarded_at IS NULL",
            Instant.now(), salonId, subscriptionId);
        jdbc.update("DELETE FROM push_subscriptions WHERE id=? AND salon_id=?",
            subscriptionId, salonId);
    }

    private void discardPending(long salonId, long userId,
            PushSubscriptionAudience audience, String endpointHash, String reason) {
        jdbc.update("UPDATE push_outbox SET discarded_at=?,last_error=? WHERE salon_id=? "
                + "AND subscription_id IN (SELECT id FROM push_subscriptions WHERE salon_id=? "
                + "AND user_id=? AND audience=? AND endpoint_hash=?) AND sent_at IS NULL "
                + "AND discarded_at IS NULL", Instant.now(), reason, salonId, salonId,
            userId, audience.name(), endpointHash);
    }

    private static String validEndpoint(String input) {
        if (input == null || input.isBlank() || input.length() > 2048)
            throw new IllegalArgumentException("endpoint must contain at most 2048 characters");
        try {
            URI endpoint = URI.create(input.trim());
            if (!"https".equalsIgnoreCase(endpoint.getScheme()) || endpoint.getHost() == null
                    || endpoint.getUserInfo() != null)
                throw new IllegalArgumentException();
            return endpoint.toASCIIString();
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("endpoint must be an absolute HTTPS URL");
        }
    }

    private static String validKey(String input, int min, int max, String name) {
        if (input == null || input.length() < min || input.length() > max
                || !input.matches("[A-Za-z0-9_-]+={0,2}"))
            throw new IllegalArgumentException(name + " must be base64url encoded");
        return input;
    }

    private static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
