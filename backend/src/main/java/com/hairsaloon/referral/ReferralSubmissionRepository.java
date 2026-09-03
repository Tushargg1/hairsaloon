package com.hairsaloon.referral;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferralSubmissionRepository extends JpaRepository<ReferralSubmission, Long> {

    List<ReferralSubmission> findByReferrerIdOrderByCreatedAtDesc(Long referrerId);

    List<ReferralSubmission> findByStatusOrderByCreatedAtDesc(ReferralStatus status);

    // Active = not rejected. Used to block a second referral of the same salon.
    boolean existsBySalonPhoneNormalizedAndStatusNot(String salonPhoneNormalized,
                                                     ReferralStatus status);
}
