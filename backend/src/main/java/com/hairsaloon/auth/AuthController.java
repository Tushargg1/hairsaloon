package com.hairsaloon.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/auth")
class AuthController {
    private final AuthService authService;
    private final AuthCookieService cookies;
    private final LoginRateLimiter rateLimiter;

    AuthController(AuthService authService, AuthCookieService cookies, LoginRateLimiter rateLimiter) {
        this.authService = authService;
        this.cookies = cookies;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/signup")
    ResponseEntity<UserResponse> signup(@Valid @RequestBody SignupRequest request) {
        AuthService.AuthResult result = authService.signup(request.phone(), request.email(),
            request.password(), request.verificationProof());
        return ResponseEntity.status(HttpStatus.CREATED)
            .header(HttpHeaders.SET_COOKIE, cookies.authenticated(result.token()).toString())
            .body(UserResponse.from(result.user()));
    }

    @PostMapping("/login")
    ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request,
                                        HttpServletRequest httpRequest) {
        String ip = httpRequest.getRemoteAddr();
        String principal = AuthService.normalizePhone(request.phone());
        enforceRateLimit("customer-login", ip, principal);
        try {
            AuthService.AuthResult result = authService.customerLogin(request.phone(),
                request.password());
            rateLimiter.recordSuccess("customer-login", ip, principal);
            return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.authenticated(result.token()).toString())
                .body(UserResponse.from(result.user()));
        } catch (AuthException failure) {
            rateLimiter.recordFailure("customer-login", ip, principal);
            throw failure;
        }
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.cleared().toString()).build();
    }

    @GetMapping("/me")
    UserResponse me(@AuthenticationPrincipal AuthenticatedUser user) {
        return UserResponse.from(user);
    }

    private void enforceRateLimit(String scope, String ip, String principal) {
        LoginRateLimiter.Decision decision = rateLimiter.check(scope, ip, principal);
        if (decision.blocked()) {
            throw new AuthException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                "Too many attempts. Please wait and try again.", decision.retryAfterSeconds());
        }
    }

    record SignupRequest(
        @NotBlank @Size(min = 10, max = 15) String phone,
        @Email @Size(max = 320) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @Size(max = 200) String verificationProof) {
        SignupRequest {
            phone = phone == null ? null : phone.trim();
            email = email == null || email.isBlank() ? null : email.trim();
            verificationProof = verificationProof == null ? null : verificationProof.trim();
        }
    }

    record LoginRequest(
        @NotBlank @Size(min = 10, max = 15) String phone,
        @NotBlank @Size(min = 8, max = 72) String password) {
        LoginRequest { phone = phone == null ? null : phone.trim(); }
    }

    record UserResponse(Long id, String name, String phone, String email, UserRole role) {
        static UserResponse from(AuthenticatedUser user) {
            return new UserResponse(user.id(), user.name(), user.phone(), user.email(), user.role());
        }
    }
}
