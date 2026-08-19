package com.hairsaloon.auth;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

interface AuthChallengeRepository extends JpaRepository<AuthChallenge, Long> {
    Optional<AuthChallenge> findTopByPhoneHashAndPurposeOrderByCreatedAtDesc(
        String phoneHash, AuthChallengePurpose purpose);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AuthChallenge> findByChallengeHash(String challengeHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AuthChallenge> findByProofHash(String proofHash);
}
