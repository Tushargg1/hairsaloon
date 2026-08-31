package com.hairsaloon.tenant;

import com.hairsaloon.web.ApiErrorWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashSet;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.cors.CorsProcessor;
import org.springframework.web.cors.DefaultCorsProcessor;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TenantResolutionFilter extends OncePerRequestFilter {

    private static final Pattern SUBDOMAIN =
        Pattern.compile("[a-z0-9][a-z0-9-]{1,28}[a-z0-9]");

    private final TenantResolver tenantResolver;
    private final ApiErrorWriter errors;
    private final CorsConfigurationSource corsSource;
    private final CorsProcessor corsProcessor = new DefaultCorsProcessor();
    private final String baseDomain;
    private final Set<String> platformHosts;

    public TenantResolutionFilter(TenantResolver tenantResolver, ApiErrorWriter errors,
                                  @Qualifier("corsConfigurationSource") CorsConfigurationSource corsSource,
                                  TenantProperties properties) {
        this.tenantResolver = tenantResolver;
        this.errors = errors;
        this.corsSource = corsSource;
        this.baseDomain = parseHost(properties.getBaseDomain());
        this.platformHosts = new HashSet<>();
        properties.getPlatformHosts().forEach(host -> platformHosts.add(parseHost(host)));
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.equals("/actuator/health") || path.startsWith("/actuator/health/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        TenantContext.clear();
        // This filter can end the request with a 404 before Spring Security's CorsFilter
        // runs, so apply the CORS headers here or the browser discards those responses.
        CorsConfiguration cors = corsSource.getCorsConfiguration(request);
        if (cors != null && !corsProcessor.processRequest(cors, request, response)) {
            return;
        }
        // A CORS preflight carries no tenant and is fully answered above; continuing into
        // tenant resolution would 404 it and strip the just-written CORS headers.
        if (CorsUtils.isPreFlightRequest(request)) {
            return;
        }
        try {
            String host;
            try {
                // Tenant sites are served by Vercel, which proxies /api here but drops the
                // salon subdomain, so the SPA sends it as X-Tenant-Host. This only selects
                // which public data is shown; owners are still checked by verifyOwner and
                // customers only ever see their own rows, so the value need not be trusted.
                String tenantHost = request.getHeader("X-Tenant-Host");
                host = parseHost(tenantHost != null && !tenantHost.isBlank()
                    ? tenantHost : request.getServerName());
            } catch (IllegalArgumentException invalidHost) {
                salonNotFound(response);
                return;
            }

            if (platformHosts.contains(host)) {
                // Tenant endpoints need a salon; without this they reach the handler
                // with no tenant and throw, returning 500 and logging a stack trace
                // for anyone who calls /api/salon/** on the platform host.
                if (request.getRequestURI().startsWith("/api/salon/")) {
                    salonNotFound(response);
                    return;
                }
                filterChain.doFilter(request, response);
                return;
            }

            Optional<String> subdomain = tenantSubdomain(host);
            if (subdomain.isEmpty()) {
                salonNotFound(response);
                return;
            }

            Optional<Long> salonId = tenantResolver.resolveActiveSalonId(subdomain.get());
            if (salonId.isEmpty()) {
                // Registered but pending or suspended: only the public profile is served,
                // carrying status=SUSPENDED/PENDING so the site can render a contact page.
                // Everything else (services, bookings, ...) stays 404 so nothing is shown.
                Optional<Long> inactiveId = tenantResolver.resolveAnySalonId(subdomain.get());
                if (inactiveId.isEmpty()) {
                    salonNotFound(response);
                } else if (isProfileRequest(request) || isPlatformRequest(request)
                        || isDashboardRequest(request)) {
                    // Serve the public profile (for the contact page), let platform/auth
                    // routes through so the owner can sign in, and allow the owner
                    // dashboard (still guarded by verifyOwner) so they can manage a salon
                    // that is pending or suspended. Only the public /api/salon reads that
                    // customers see stay hidden until the salon is active.
                    TenantContext.setSalonId(inactiveId.get());
                    filterChain.doFilter(request, response);
                } else {
                    errors.notFound(response, "SALON_INACTIVE", "This salon is not open yet");
                }
                return;
            }

            TenantContext.setSalonId(salonId.get());
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private Optional<String> tenantSubdomain(String host) {
        String suffix = "." + baseDomain;
        if (!host.endsWith(suffix)) {
            return Optional.empty();
        }
        String candidate = host.substring(0, host.length() - suffix.length());
        return SUBDOMAIN.matcher(candidate).matches()
            ? Optional.of(candidate)
            : Optional.empty();
    }

    static String parseHost(String hostHeader) {
        if (hostHeader == null || hostHeader.isBlank()) {
            throw new IllegalArgumentException("Host is required");
        }
        String value = hostHeader.trim().toLowerCase(Locale.ROOT);
        if (value.contains(",") || value.chars().anyMatch(Character::isWhitespace)) {
            throw new IllegalArgumentException("Invalid Host header");
        }

        String host;
        if (value.startsWith("[")) {
            int closingBracket = value.indexOf(']');
            if (closingBracket < 0) {
                throw new IllegalArgumentException("Invalid IPv6 Host header");
            }
            host = value.substring(1, closingBracket);
            validatePort(value.substring(closingBracket + 1));
        } else {
            int firstColon = value.indexOf(':');
            int lastColon = value.lastIndexOf(':');
            if (firstColon != lastColon) {
                throw new IllegalArgumentException("IPv6 Host headers must be bracketed");
            }
            host = firstColon < 0 ? value : value.substring(0, firstColon);
            validatePort(firstColon < 0 ? "" : value.substring(firstColon));
        }

        if (host.endsWith(".")) {
            host = host.substring(0, host.length() - 1);
        }
        if (host.isBlank() || !host.matches("[a-z0-9.:-]+")) {
            throw new IllegalArgumentException("Invalid Host header");
        }
        return host;
    }

    private static void validatePort(String portPart) {
        if (portPart.isEmpty()) {
            return;
        }
        if (!portPart.matches(":[0-9]{1,5}")) {
            throw new IllegalArgumentException("Invalid Host port");
        }
        int port = Integer.parseInt(portPart.substring(1));
        if (port > 65535) {
            throw new IllegalArgumentException("Invalid Host port");
        }
    }

    private static boolean isProfileRequest(HttpServletRequest request) {
        return "GET".equalsIgnoreCase(request.getMethod())
            && request.getRequestURI().equals("/api/salon/profile");
    }

    private static boolean isPlatformRequest(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/api/platform/");
    }

    private static boolean isDashboardRequest(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/api/salon/dashboard/");
    }

    private void salonNotFound(HttpServletResponse response) throws IOException {
        errors.notFound(response, "SALON_NOT_FOUND", "Salon not found");
    }
}
