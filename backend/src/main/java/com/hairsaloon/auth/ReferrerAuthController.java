package com.hairsaloon.auth;

import com.hairsaloon.referral.ReferralService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Signup/login for referral-program partners; issues the same auth cookie. */
@RestController
@RequestMapping("/api/platform/auth")
class ReferrerAuthController {

    private final AuthService authService;
    private final AuthCookieService cookies;
    private final LoginRateLimiter rateLimiter;
    private final ReferralService referrals;

    ReferrerAuthController(AuthService authService, AuthCookieService cookies,
                           LoginRateLimiter rateLimiter, ReferralService referrals) {
        this.authService = authService;
        this.cookies = cookies;
        this.rateLimiter = rateLimiter;
        this.referrals = referrals;
    }

    @PostMapping("/referrer-signup")
    ResponseEntity<AuthController.UserResponse> signup(@Valid @RequestBody ReferrerSignupRequest request,
                                        HttpServletRequest httpRequest) {
        String ip = LoginRateLimiter.clientIp(httpRequest);
        String principal = AuthService.normalizePhone(request.phone());
        enforceRateLimit("referrer-signup", ip, principal);
        try {
            AuthService.AuthResult result = authService.referrerSignup(request.name(),
                request.phone(), request.password());
            referrals.createProfile(result.user().id());
            rateLimiter.recordSuccess("referrer-signup", ip, principal);
            return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookies.authenticated(result.token()).toString())
                .body(AuthController.UserResponse.from(result.user()));
        } catch (AuthException failure) {
            rateLimiter.recordFailure("referrer-signup", ip, principal);
            throw failure;
        }
    }

    @PostMapping("/referrer-login")
    ResponseEntity<AuthController.UserResponse> login(@Valid @RequestBody ReferrerLoginRequest request,
                                       HttpServletRequest httpRequest) {
        String ip = LoginRateLimiter.clientIp(httpRequest);
        String principal = AuthService.normalizePhone(request.phone());
        enforceRateLimit("referrer-login", ip, principal);
        try {
            AuthService.AuthResult result = authService.referrerLogin(request.phone(),
                request.password());
            rateLimiter.recordSuccess("referrer-login", ip, principal);
            return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.authenticated(result.token()).toString())
                .body(AuthController.UserResponse.from(result.user()));
        } catch (AuthException failure) {
            rateLimiter.recordFailure("referrer-login", ip, principal);
            throw failure;
        }
    }

    private void enforceRateLimit(String scope, String ip, String principal) {
        LoginRateLimiter.Decision decision = rateLimiter.check(scope, ip, principal);
        if (decision.blocked()) {
            throw new AuthException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                "Too many attempts. Please wait and try again.", decision.retryAfterSeconds());
        }
    }

    record ReferrerSignupRequest(
        @NotBlank @Size(min = 2, max = 160) String name,
        @NotBlank @Size(min = 10, max = 15) String phone,
        @NotBlank @Size(min = 8, max = 72) String password) {
        ReferrerSignupRequest {
            name = name == null ? null : name.trim();
            phone = phone == null ? null : phone.trim();
        }
    }

    record ReferrerLoginRequest(
        @NotBlank @Size(min = 10, max = 15) String phone,
        @NotBlank @Size(min = 8, max = 72) String password) {
        ReferrerLoginRequest { phone = phone == null ? null : phone.trim(); }
    }
}
