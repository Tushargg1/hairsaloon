package com.hairsaloon.config;

import com.hairsaloon.tenant.TenantProperties;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableConfigurationProperties({CorsProperties.class, TenantProperties.class})
public class CorsSecurityConfiguration {

    @Bean
    CorsConfigurationSource corsConfigurationSource(CorsProperties properties) {
        validateOrigins(properties);
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowCredentials(true);
        configuration.setAllowedOrigins(properties.getAllowedOrigins());
        configuration.setAllowedOriginPatterns(properties.getAllowedOriginPatterns());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of(
            "Authorization", "Content-Type", "Idempotency-Key", "X-XSRF-TOKEN"));
        configuration.setExposedHeaders(List.of("Retry-After"));
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private static void validateOrigins(CorsProperties properties) {
        if (properties.getAllowedOrigins().stream().anyMatch(origin -> origin.contains("*"))) {
            throw new IllegalArgumentException("Exact CORS origins must not contain wildcards");
        }
        if (properties.getAllowedOriginPatterns().stream()
                .anyMatch(pattern -> "*".equals(pattern.trim()))) {
            throw new IllegalArgumentException("A global CORS origin pattern is forbidden");
        }
    }
}
