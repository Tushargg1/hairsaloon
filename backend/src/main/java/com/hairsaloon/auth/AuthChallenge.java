package com.hairsaloon.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "auth_challenges")
class AuthChallenge {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "challenge_hash", nullable = false, unique = true, length = 64)
    private String challengeHash;
    @Column(name = "phone_hash", nullable = false, length = 64)
    private String phoneHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private AuthChallengePurpose purpose;
    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;
    @Column(name = "proof_hash", unique = true, length = 64)
    private String proofHash;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "proof_expires_at")
    private Instant proofExpiresAt;
    @Column(nullable = false)
    private int attempts;
    @Column(name = "last_sent_at", nullable = false)
    private Instant lastSentAt;
    @Column(name = "resend_available_at", nullable = false)
    private Instant resendAvailableAt;
    @Column(name = "verified_at")
    private Instant verifiedAt;
    @Column(name = "consumed_at")
    private Instant consumedAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AuthChallenge() {}

    AuthChallenge(String challengeHash, String phoneHash, AuthChallengePurpose purpose,
                  String codeHash, Instant now, Instant expiresAt, Instant resendAvailableAt) {
        this.challengeHash = challengeHash;
        this.phoneHash = phoneHash;
        this.purpose = purpose;
        this.codeHash = codeHash;
        this.lastSentAt = now;
        this.createdAt = now;
        this.expiresAt = expiresAt;
        this.resendAvailableAt = resendAvailableAt;
    }

    String getChallengeHash() { return challengeHash; }
    String getPhoneHash() { return phoneHash; }
    AuthChallengePurpose getPurpose() { return purpose; }
    String getCodeHash() { return codeHash; }
    Instant getExpiresAt() { return expiresAt; }
    Instant getProofExpiresAt() { return proofExpiresAt; }
    int getAttempts() { return attempts; }
    Instant getResendAvailableAt() { return resendAvailableAt; }
    Instant getVerifiedAt() { return verifiedAt; }
    Instant getConsumedAt() { return consumedAt; }

    void recordFailedAttempt() { attempts++; }

    void verify(String proofHash, Instant verifiedAt, Instant proofExpiresAt) {
        this.proofHash = proofHash;
        this.verifiedAt = verifiedAt;
        this.proofExpiresAt = proofExpiresAt;
    }

    void consume(Instant consumedAt) { this.consumedAt = consumedAt; }
}
