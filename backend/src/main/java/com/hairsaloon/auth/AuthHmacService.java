package com.hairsaloon.auth;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
class AuthHmacService {
    private static final String ALGORITHM = "HmacSHA256";
    private final byte[] key;

    AuthHmacService(AuthProperties properties) {
        String configured = properties.getSecurity().getHmacSecret();
        String material = configured == null || configured.isBlank()
            ? "derived-auth-hmac\u0000" + properties.getJwt().getSecret() : configured.trim();
        if (material.length() < 32) {
            throw new IllegalStateException(
                "Auth HMAC secret (or JWT secret used to derive it) must contain at least 32 characters");
        }
        this.key = sha256(material.getBytes(StandardCharsets.UTF_8));
    }

    String hash(String namespace, String value) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(key, ALGORITHM));
            return HexFormat.of().formatHex(mac.doFinal(
                (namespace + "\u0000" + value).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException impossible) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", impossible);
        }
    }

    boolean matches(String expectedHex, String namespace, String value) {
        if (expectedHex == null) return false;
        return MessageDigest.isEqual(expectedHex.getBytes(StandardCharsets.US_ASCII),
            hash(namespace, value).getBytes(StandardCharsets.US_ASCII));
    }

    private static byte[] sha256(byte[] value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value);
        } catch (GeneralSecurityException impossible) {
            throw new IllegalStateException("SHA-256 unavailable", impossible);
        }
    }
}
