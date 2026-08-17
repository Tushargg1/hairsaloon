package com.hairsaloon.auth;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
class AuthCookieService {

    static final String COOKIE_NAME = "auth_token";
    private final AuthProperties properties;

    AuthCookieService(AuthProperties properties) {
        this.properties = properties;
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
            .sameSite("Lax")
            .path("/");
        String domain = properties.getCookie().getDomain();
        if (domain != null && !domain.isBlank()) {
            builder.domain(domain);
        }
        return builder;
    }
}
