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
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TenantResolutionFilter extends OncePerRequestFilter {

    private static final Pattern SUBDOMAIN =
        Pattern.compile("[a-z0-9][a-z0-9-]{1,28}[a-z0-9]");

    private final TenantResolver tenantResolver;
    private final ApiErrorWriter errors;
    private final String baseDomain;
    private final Set<String> platformHosts;

    public TenantResolutionFilter(TenantResolver tenantResolver, ApiErrorWriter errors,
                                  TenantProperties properties) {
        this.tenantResolver = tenantResolver;
        this.errors = errors;
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
        try {
            String host;
            try {
                host = parseHost(request.getHeader("Host"));
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
                salonNotFound(response);
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

    private void salonNotFound(HttpServletResponse response) throws IOException {
        errors.notFound(response, "SALON_NOT_FOUND", "Salon not found");
    }
}
