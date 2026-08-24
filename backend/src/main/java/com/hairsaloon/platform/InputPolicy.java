package com.hairsaloon.platform;

import java.net.URI;
import java.time.ZoneId;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Shared request sanitization and the standard failure shapes built on top of it.
 * Used by both the platform and tenant-data layers, so it lives here rather than in
 * either one; a second copy previously drifted inside PlatformSalonService.
 */
public final class InputPolicy {
    private InputPolicy() {}

    public static String text(String input, int max, String field, boolean required) {
        String value = input == null ? "" : input.replaceAll("(?s)<[^>]*>", "")
            .chars().filter(c -> !Character.isISOControl(c) || c == '\n' || c == '\t')
            .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append)
            .toString().trim();
        if (required && value.isBlank()) throw validation(field, "must not be blank");
        if (value.length() > max) throw validation(field, "must not exceed " + max + " characters");
        return value.isBlank() ? null : value;
    }

    public static String url(String input, String field) {
        String value = text(input, 2048, field, false);
        if (value == null) return null;
        try {
            URI uri = URI.create(value);
            if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null || uri.getUserInfo() != null) throw new IllegalArgumentException();
            return uri.toASCIIString();
        } catch (IllegalArgumentException invalid) {
            throw validation(field, "must be an absolute HTTP or HTTPS URL");
        }
    }

    public static String email(String input) {
        String value = text(input, 320, "email", false);
        if (value == null) return null;
        value = value.toLowerCase(Locale.ROOT);
        if (!value.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
            throw validation("email", "must be a valid email address");
        return value;
    }

    public static String phone(String input) {
        String value = text(input, 32, "phone", false);
        if (value != null && !value.matches("[+0-9() .-]{7,32}"))
            throw validation("phone", "must be a valid phone number");
        return value;
    }

    public static String timezone(String input) {
        String value = text(input, 64, "timezone", true);
        if (!ZoneId.getAvailableZoneIds().contains(value))
            throw validation("timezone", "must be a recognized IANA timezone");
        return value;
    }

    public static PlatformApiException validation(String field, String message) {
        return new PlatformApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
            "Request validation failed", Map.of(field, message));
    }

    public static PlatformApiException notFound(String resource) {
        return new PlatformApiException(HttpStatus.NOT_FOUND,
            resource.toUpperCase(Locale.ROOT) + "_NOT_FOUND", resource + " was not found");
    }

    public static PlatformApiException conflict(String code, String message) {
        return new PlatformApiException(HttpStatus.CONFLICT, code, message);
    }
}
