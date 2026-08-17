package com.hairsaloon.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

class CorsSecurityConfigurationTest {

    @Test
    void credentialsUseExactRootOriginAndSubdomainPatternWithoutGlobalWildcard() {
        CorsProperties properties = new CorsProperties();
        properties.setAllowedOrigins(List.of("https://yoursite.com"));
        properties.setAllowedOriginPatterns(List.of("https://*.yoursite.com"));
        CorsConfigurationSource source =
            new CorsSecurityConfiguration().corsConfigurationSource(properties);
        CorsConfiguration configuration = source.getCorsConfiguration(new MockHttpServletRequest());

        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowCredentials()).isTrue();
        assertThat(configuration.getAllowedOrigins()).containsExactly("https://yoursite.com");
        assertThat(configuration.checkOrigin("https://yoursite.com"))
            .isEqualTo("https://yoursite.com");
        assertThat(configuration.checkOrigin("https://glamour.yoursite.com"))
            .isEqualTo("https://glamour.yoursite.com");
        assertThat(configuration.checkOrigin("https://evil.example")) .isNull();
    }

    @Test
    void rejectsGlobalOriginWildcard() {
        CorsProperties properties = new CorsProperties();
        properties.setAllowedOrigins(List.of("*"));
        assertThatThrownBy(() ->
            new CorsSecurityConfiguration().corsConfigurationSource(properties))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
