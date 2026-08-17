package com.hairsaloon.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
class JwtService {

    private final SecretKey key;
    private final String issuer;
    private final java.time.Duration ttl;

    JwtService(AuthProperties properties) {
        byte[] secret = secretBytes(properties.getJwt().getSecret());
        if (secret.length < 64) {
            throw new IllegalStateException("JWT secret must contain at least 64 bytes");
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.issuer = properties.getJwt().getIssuer();
        this.ttl = properties.getJwt().getTtl();
        if (issuer == null || issuer.isBlank()) {
            throw new IllegalStateException("JWT issuer is required");
        }
        if (ttl == null || ttl.isZero() || ttl.isNegative()) {
            throw new IllegalStateException("JWT TTL must be positive");
        }
    }

    String issue(User user) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
            .subject(user.getId().toString())
            .issuer(issuer)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(ttl)))
            .claim("phone", user.getPhone())
            .claim("role", user.getRole().name());
        if (user.getEmail() != null) {
            builder.claim("email", user.getEmail());
        }
        return builder.signWith(key, Jwts.SIG.HS512).compact();
    }

    TokenClaims parse(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(key)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
            long userId = Long.parseLong(claims.getSubject());
            String phone = claims.get("phone", String.class);
            String email = claims.get("email", String.class);
            UserRole role = UserRole.valueOf(claims.get("role", String.class));
            if (userId <= 0 || phone == null || phone.isBlank()) {
                throw new JwtValidationException();
            }
            return new TokenClaims(userId, phone, email, role);
        } catch (JwtException | IllegalArgumentException | NullPointerException invalid) {
            throw new JwtValidationException();
        }
    }

    private static byte[] secretBytes(String configured) {
        if (configured == null || configured.isBlank()) {
            return new byte[0];
        }
        String value = configured.trim();
        if (value.startsWith("raw:")) {
            return value.substring(4).getBytes(StandardCharsets.UTF_8);
        }
        if (value.startsWith("base64:")) {
            try {
                return Base64.getDecoder().decode(value.substring(7));
            } catch (IllegalArgumentException invalidBase64) {
                return new byte[0];
            }
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(value);
            if (decoded.length >= 64) {
                return decoded;
            }
        } catch (IllegalArgumentException ignored) {
            // A non-base64 value is treated as a raw secret.
        }
        return value.getBytes(StandardCharsets.UTF_8);
    }

    record TokenClaims(long userId, String phone, String email, UserRole role) {
    }

    static class JwtValidationException extends RuntimeException {
    }
}
