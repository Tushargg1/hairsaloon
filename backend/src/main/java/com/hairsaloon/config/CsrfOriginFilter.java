package com.hairsaloon.config;

import com.hairsaloon.web.ApiErrorWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Rejects state-changing requests that arrive with a disallowed {@code Origin}.
 *
 * <p>CSRF tokens are not used because the API is stateless and cookie-authenticated.
 * JSON bodies are already protected by the CORS preflight, but a cross-site HTML form
 * can issue a bodyless POST without any preflight, which reaches endpoints such as
 * {@code POST /api/platform/admin/salons/{id}/approve} with the victim's cookie
 * attached. A browser cannot suppress or forge {@code Origin} on such a request, so
 * checking it closes that gap. A missing header means the caller is not a browser
 * performing a cross-site request, so it is allowed.
 */
@Component
public class CsrfOriginFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final CorsConfigurationSource corsConfigurationSource;
    private final ApiErrorWriter errors;

    public CsrfOriginFilter(CorsConfigurationSource corsConfigurationSource,
                            ApiErrorWriter errors) {
        this.corsConfigurationSource = corsConfigurationSource;
        this.errors = errors;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        String origin = request.getHeader("Origin");
        if (origin == null || SAFE_METHODS.contains(request.getMethod().toUpperCase())) {
            filterChain.doFilter(request, response);
            return;
        }
        CorsConfiguration configuration = corsConfigurationSource.getCorsConfiguration(request);
        if (configuration == null || configuration.checkOrigin(origin) == null) {
            errors.forbidden(response);
            return;
        }
        filterChain.doFilter(request, response);
    }
}
