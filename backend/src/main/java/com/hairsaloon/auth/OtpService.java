package com.hairsaloon.auth;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class OtpService {
    private final AuthChallengeRepository challenges;
    private final UserRepository users;
    private final AuthHmacService hmac;
    private final SmsGateway sms;
    private final AuthProperties.Otp config;
    private final SecureRandom random = new SecureRandom();

    OtpService(AuthChallengeRepository challenges, UserRepository users, AuthHmacService hmac,
               SmsGateway sms, AuthProperties properties) {
        this.challenges = challenges;
        this.users = users;
        this.hmac = hmac;
        this.sms = sms;
        this.config = properties.getOtp();
        if (config.getCodeLength() < 4 || config.getCodeLength() > 9
                || config.getMaxAttempts() < 1 || invalid(config.getChallengeTtl())
                || invalid(config.getProofTtl()) || invalid(config.getResendDelay())) {
            throw new IllegalStateException("OTP settings are invalid");
        }
    }

    @Transactional
    ChallengeResult request(String phone, AuthChallengePurpose purpose) {
        String normalizedPhone = AuthService.normalizePhone(phone);
        boolean eligible = purpose == AuthChallengePurpose.SIGNUP
            || users.findByPhone(normalizedPhone)
                .filter(user -> user.getRole() == UserRole.CUSTOMER).isPresent();
        if (purpose == AuthChallengePurpose.SIGNUP && users.existsByPhone(normalizedPhone)) {
            throw new AuthException(HttpStatus.CONFLICT, "PHONE_EXISTS",
                "An account with this phone number already exists");
        }
        Instant now = Instant.now();
        String phoneHash = hmac.hash("otp-phone", normalizedPhone);
        var latest = challenges.findTopByPhoneHashAndPurposeOrderByCreatedAtDesc(phoneHash, purpose);
        if (eligible && latest.isPresent() && latest.get().getConsumedAt() == null
                && now.isBefore(latest.get().getResendAvailableAt())) {
            long retry = Math.max(1,
                Duration.between(now, latest.get().getResendAvailableAt()).toSeconds() + 1);
            if (purpose == AuthChallengePurpose.SIGNUP) {
                throw new AuthException(HttpStatus.TOO_MANY_REQUESTS, "OTP_RESEND_TOO_SOON",
                    "Please wait before requesting another code", retry);
            }
            return decoy(now);
        }
        if (!eligible) return decoy(now);

        String challengeId = randomToken();
        String code = numericCode();
        AuthChallenge challenge = new AuthChallenge(
            hmac.hash("otp-challenge", challengeId), phoneHash, purpose,
            codeHash(challengeId, code), now, now.plus(config.getChallengeTtl()),
            now.plus(config.getResendDelay()));
        challenges.save(challenge);
        sms.sendVerificationCode(normalizedPhone, code, purpose.name());
        return new ChallengeResult(challengeId, config.getChallengeTtl().toSeconds(),
            config.getResendDelay().toSeconds(), config.isExposeCode() ? code : null);
    }

    @Transactional(noRollbackFor = AuthException.class)
    ProofResult verify(String challengeId, String code) {
        AuthChallenge challenge = challenges.findByChallengeHash(
                hmac.hash("otp-challenge", challengeId))
            .orElseThrow(OtpService::invalidCode);
        Instant now = Instant.now();
        if (challenge.getConsumedAt() != null || challenge.getVerifiedAt() != null) {
            throw new AuthException(HttpStatus.CONFLICT, "OTP_ALREADY_VERIFIED",
                "This verification code has already been verified");
        }
        if (!now.isBefore(challenge.getExpiresAt())) {
            throw new AuthException(HttpStatus.GONE, "OTP_EXPIRED",
                "The verification code has expired");
        }
        if (challenge.getAttempts() >= config.getMaxAttempts()) throw attemptsExceeded();
        if (!hmac.matches(challenge.getCodeHash(), "otp-code", challengeId + "\u0000" + code)) {
            challenge.recordFailedAttempt();
            challenges.save(challenge);
            if (challenge.getAttempts() >= config.getMaxAttempts()) throw attemptsExceeded();
            throw invalidCode();
        }
        String proof = randomToken() + randomToken();
        challenge.verify(hmac.hash("otp-proof", proof), now, now.plus(config.getProofTtl()));
        challenges.save(challenge);
        return new ProofResult(proof, config.getProofTtl().toSeconds());
    }

    @Transactional
    Instant consumeProof(String proof, String phone, AuthChallengePurpose purpose) {
        if (proof == null || proof.isBlank()) throw invalidProof();
        AuthChallenge challenge = challenges.findByProofHash(hmac.hash("otp-proof", proof))
            .orElseThrow(OtpService::invalidProof);
        Instant now = Instant.now();
        boolean phoneMatches = hmac.matches(challenge.getPhoneHash(), "otp-phone",
            AuthService.normalizePhone(phone));
        if (!phoneMatches || challenge.getPurpose() != purpose
                || challenge.getVerifiedAt() == null || challenge.getConsumedAt() != null
                || challenge.getProofExpiresAt() == null
                || !now.isBefore(challenge.getProofExpiresAt())) {
            throw invalidProof();
        }
        challenge.consume(now);
        challenges.save(challenge);
        return challenge.getVerifiedAt();
    }

    private ChallengeResult decoy(Instant now) {
        return new ChallengeResult(randomToken(), config.getChallengeTtl().toSeconds(),
            config.getResendDelay().toSeconds(), null);
    }

    private String numericCode() {
        int bound = 1;
        for (int i = 0; i < config.getCodeLength(); i++) bound *= 10;
        return String.format("%0" + config.getCodeLength() + "d", random.nextInt(bound));
    }

    private String codeHash(String challengeId, String code) {
        return hmac.hash("otp-code", challengeId + "\u0000" + code);
    }

    private static String randomToken() { return UUID.randomUUID().toString(); }
    private static boolean invalid(Duration value) {
        return value == null || value.isZero() || value.isNegative();
    }
    private static AuthException invalidCode() {
        return new AuthException(HttpStatus.BAD_REQUEST, "OTP_INVALID",
            "The verification code is invalid");
    }
    private static AuthException invalidProof() {
        return new AuthException(HttpStatus.BAD_REQUEST, "VERIFICATION_PROOF_INVALID",
            "The verification proof is invalid or expired");
    }
    private static AuthException attemptsExceeded() {
        return new AuthException(HttpStatus.TOO_MANY_REQUESTS, "OTP_ATTEMPTS_EXCEEDED",
            "Too many verification attempts");
    }

    record ChallengeResult(String challengeId, long expiresInSeconds,
                           long resendAfterSeconds, String code) {}
    record ProofResult(String verificationProof, long expiresInSeconds) {}
}
