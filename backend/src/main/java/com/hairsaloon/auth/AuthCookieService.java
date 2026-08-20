package com.hairsaloon.auth;

import java.util.Set;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
class AuthCookieService {

    static final String COOKIE_NAME = "auth_token";
    private static final Set<String> SAME_SITE_VALUES = Set.of("Lax", "Strict", "None");

    private final AuthProperties properties;
    private final String sameSite;

    AuthCookieService(AuthProperties properties) {
        this.properties = properties;
        this.sameSite = normalizeSameSite(properties.getCookie().getSameSite());
        // Browsers silently discard SameSite=None cookies sent without Secure, which
        // would look like a broken login rather than a misconfiguration.
        if ("None".equals(this.sameSite) && !properties.getCookie().isSecure()) {
            throw new IllegalStateException(
                "app.auth.cookie.same-site=None requires app.auth.cookie.secure=true");
        }
    }

    private static String normalizeSameSite(String configured) {
        if (configured == null || configured.isBlank()) {
            return "Lax";
        }
        String value = configured.trim();
        return SAME_SITE_VALUES.stream()
            .filter(allowed -> allowed.equalsIgnoreCase(value))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException(
                "app.auth.cookie.same-site must be one of Lax, Strict, or None"));
    }

    ResponseCookie authenticated(String token) {
        return base(token)
            .maxAge(properties.getJwt().getTtl())
            .build();
    }

    ResponseCookie cleared() {
        return base("")
            .maxAge(0)
            .build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie
            .from(COOKIE_NAME, value)
            .httpOnly(true)
            .secure(properties.getCookie().isSecure())
            .sameSite(sameSite)
            .path("/");
        String domain = properties.getCookie().getDomain();
        if (domain != null && !domain.isBlank()) {
            builder.domain(domain);
        }
        return builder;
    }
}
