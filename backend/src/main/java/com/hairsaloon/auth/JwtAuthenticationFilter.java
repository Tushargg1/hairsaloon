package com.hairsaloon.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    // Re-issue the cookie at most this often, so the session slides on activity
    // (inactivity timeout) without minting a new token on every single request.
    private static final java.time.Duration REFRESH_INTERVAL = java.time.Duration.ofMinutes(30);

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final AuthCookieService cookieService;

    JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository,
                            AuthCookieService cookieService) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.cookieService = cookieService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        String token = cookieToken(request);
        if (token != null) {
            try {
                JwtService.TokenClaims claims = jwtService.parse(token);
                User user = userRepository.findById(claims.userId())
                    .orElseThrow(JwtService.JwtValidationException::new);
                if (user.getRole() != claims.role()) {
                    throw new JwtService.JwtValidationException();
                }
                AuthenticatedUser principal = new AuthenticatedUser(
                    user.getId(), user.getName(), user.getPhone(), user.getEmail(), user.getRole());
                var authority = new SimpleGrantedAuthority("ROLE_" + user.getRole().name());
                SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, java.util.List.of(authority)));
                // Slide the session: if the token is older than the refresh interval,
                // mint a fresh one so continued activity keeps the user signed in
                // (session expires only after this much inactivity).
                if (java.time.Instant.now().isAfter(claims.issuedAt().plus(REFRESH_INTERVAL))) {
                    response.addHeader("Set-Cookie", cookieService.authenticated(
                        jwtService.issue(user), jwtService.ttlFor(user.getRole())).toString());
                }
            } catch (JwtService.JwtValidationException invalidToken) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }

    private static String cookieToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (AuthCookieService.COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
