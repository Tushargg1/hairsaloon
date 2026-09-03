package com.hairsaloon.referral;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferrerProfileRepository extends JpaRepository<ReferrerProfile, Long> {

    boolean existsByReferralCode(String referralCode);
}
