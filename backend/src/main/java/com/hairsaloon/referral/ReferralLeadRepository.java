package com.hairsaloon.referral;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferralLeadRepository extends JpaRepository<ReferralLead, Long> {

    long countByReferrerIdAndAssignedOn(Long referrerId, LocalDate assignedOn);

    // Active trial/live sites this referrer has created (for the per-referrer cap).
    long countByReferrerIdAndCreatedSalonIdNotNull(Long referrerId);

    boolean existsByExternalId(String externalId);

    // Distinct assignment dates for a referrer, newest first (to evaluate the hold streak).
    List<ReferralLead> findByReferrerIdOrderByAssignedOnDesc(Long referrerId);
}
