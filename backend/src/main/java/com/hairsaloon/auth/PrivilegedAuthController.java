package com.hairsaloon.auth;

import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/privileged-auth")
class PrivilegedAuthController {
    private final AuthService authService;
    private final AuthCookieService cookies;
    private final LoginRateLimiter rateLimiter;
    private final SalonRepository salons;

    PrivilegedAuthController(AuthService authService, AuthCookieService cookies,
                             LoginRateLimiter rateLimiter, SalonRepository salons) {
        this.authService = authService;
        this.cookies = cookies;
        this.rateLimiter = rateLimiter;
        this.salons = salons;
    }

    @PostMapping("/login")
    ResponseEntity<AuthController.UserResponse> login(@Valid @RequestBody LoginRequest request,
                                                       HttpServletRequest httpRequest) {
        String ip = LoginRateLimiter.clientIp(httpRequest);
        String principal = AuthService.normalize(request.email());
        LoginRateLimiter.Decision decision = rateLimiter.check("privileged-login", ip, principal);
        if (decision.blocked()) {
            throw new AuthException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                "Too many attempts. Please wait and try again.", decision.retryAfterSeconds());
        }
        try {
            AuthService.AuthResult result = authService.privilegedLogin(request.email(),
                request.password());
            rateLimiter.recordSuccess("privileged-login", ip, principal);
            String subdomain = null;
            if (result.user().role() == UserRole.SALON_OWNER) {
                subdomain = salons.findByOwnerId(result.user().id())
                    .map(Salon::getSubdomain).orElse(null);
            }
            return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.authenticated(result.token()).toString())
                .body(AuthController.UserResponse.from(result.user(), subdomain));
        } catch (AuthException failure) {
            rateLimiter.recordFailure("privileged-login", ip, principal);
            throw failure;
        }
    }

    record LoginRequest(@NotBlank @Email @Size(max = 320) String email,
                        @NotBlank @Size(min = 8, max = 72) String password) {
        LoginRequest { email = email == null ? null : email.trim(); }
    }
}
