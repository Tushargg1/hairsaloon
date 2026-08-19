package com.hairsaloon.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/auth/otp")
class OtpController {
    private final OtpService otpService;
    private final AuthService authService;
    private final LoginRateLimiter rateLimiter;

    OtpController(OtpService otpService, AuthService authService,
                  LoginRateLimiter rateLimiter) {
        this.otpService = otpService;
        this.authService = authService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/request")
    ResponseEntity<OtpService.ChallengeResult> request(@Valid @RequestBody OtpRequest request,
                                                       HttpServletRequest httpRequest) {
        String principal = OtpService.normalizePhone(request.phone());
        String scope = "otp-request-" + request.purpose().name().toLowerCase();
        enforce(scope, httpRequest.getRemoteAddr(), principal);
        try {
            OtpService.ChallengeResult result = otpService.request(request.phone(), request.purpose());
            rateLimiter.recordFailure(scope, httpRequest.getRemoteAddr(), principal);
            return ResponseEntity.accepted().body(result);
        } catch (AuthException failure) {
            rateLimiter.recordFailure(scope, httpRequest.getRemoteAddr(), principal);
            throw failure;
        }
    }

    @PostMapping("/verify")
    OtpService.ProofResult verify(@Valid @RequestBody VerifyRequest request,
                                  HttpServletRequest httpRequest) {
        String ip = httpRequest.getRemoteAddr();
        enforce("otp-verify", ip, request.challengeId());
        try {
            OtpService.ProofResult result = otpService.verify(request.challengeId(), request.code());
            rateLimiter.recordSuccess("otp-verify", ip, request.challengeId());
            return result;
        } catch (AuthException failure) {
            rateLimiter.recordFailure("otp-verify", ip, request.challengeId());
            throw failure;
        }
    }

    @PostMapping("/reset-password")
    ResponseEntity<Void> resetPassword(@Valid @RequestBody PasswordResetRequest request,
                                       HttpServletRequest httpRequest) {
        String ip = httpRequest.getRemoteAddr();
        String principal = OtpService.normalizePhone(request.phone());
        enforce("password-reset", ip, principal);
        try {
            authService.resetPassword(request.phone(), request.newPassword(),
                request.verificationProof());
            rateLimiter.recordSuccess("password-reset", ip, principal);
            return ResponseEntity.noContent().build();
        } catch (AuthException failure) {
            rateLimiter.recordFailure("password-reset", ip, principal);
            throw failure;
        }
    }

    private void enforce(String scope, String ip, String principal) {
        LoginRateLimiter.Decision decision = rateLimiter.check(scope, ip, principal);
        if (decision.blocked()) {
            throw new AuthException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                "Too many attempts. Please wait and try again.", decision.retryAfterSeconds());
        }
    }

    record OtpRequest(@NotBlank @Size(min = 10, max = 15) String phone,
                      @NotNull AuthChallengePurpose purpose) {
        OtpRequest { phone = phone == null ? null : phone.trim(); }
    }
    record VerifyRequest(@NotBlank @Size(max = 100) String challengeId,
                         @NotBlank @Size(min = 4, max = 9) String code) {
        VerifyRequest {
            challengeId = challengeId == null ? null : challengeId.trim();
            code = code == null ? null : code.trim();
        }
    }
    record PasswordResetRequest(
        @NotBlank @Size(min = 10, max = 15) String phone,
        @NotBlank @Size(min = 8, max = 72) String newPassword,
        @NotBlank @Size(max = 200) String verificationProof) {
        PasswordResetRequest {
            phone = phone == null ? null : phone.trim();
            verificationProof = verificationProof == null ? null : verificationProof.trim();
        }
    }
}
