package com.hairsaloon.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class AuthCookieServiceTest {

    @Test
    void defaultsToLaxAndKeepsCookieAttributesLockedDown() {
        ResponseCookieAssert cookie = cookieFor(properties(null, true));
        assertThat(cookie.sameSite).isEqualTo("Lax");
        assertThat(cookie.secure).isTrue();
        assertThat(cookie.httpOnly).isTrue();
    }

    @Test
    void acceptsConfiguredSameSiteCaseInsensitively() {
        assertThat(cookieFor(properties("none", true)).sameSite).isEqualTo("None");
        assertThat(cookieFor(properties("STRICT", true)).sameSite).isEqualTo("Strict");
        assertThat(cookieFor(properties("  lax  ", true)).sameSite).isEqualTo("Lax");
    }

    @Test
    void rejectsSameSiteNoneWithoutSecureBecauseBrowsersDiscardIt() {
        assertThatThrownBy(() -> new AuthCookieService(properties("None", false)))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("secure=true");
    }

    @Test
    void rejectsUnrecognizedSameSiteValue() {
        assertThatThrownBy(() -> new AuthCookieService(properties("Sometimes", true)))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Lax, Strict, or None");
    }

    private static AuthProperties properties(String sameSite, boolean secure) {
        AuthProperties properties = new AuthProperties();
        properties.getCookie().setSecure(secure);
        if (sameSite != null) {
            properties.getCookie().setSameSite(sameSite);
        }
        return properties;
    }

    private static ResponseCookieAssert cookieFor(AuthProperties properties) {
        var cookie = new AuthCookieService(properties).authenticated("token-value");
        return new ResponseCookieAssert(cookie.getSameSite(), cookie.isSecure(),
            cookie.isHttpOnly());
    }

    private record ResponseCookieAssert(String sameSite, boolean secure, boolean httpOnly) {
    }
}
