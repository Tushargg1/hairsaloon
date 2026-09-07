package com.hairsaloon.referral;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.CreationTimestamp;

/** A scraped lead handed to a referrer; links to the auto-created referral. */
@Entity
@Table(name = "referral_leads")
public class ReferralLead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "referrer_id", nullable = false)
    private Long referrerId;

    @Column(name = "external_id", nullable = false, length = 128)
    private String externalId;

    @Column(name = "submission_id")
    private Long submissionId;

    @Column(name = "assigned_on", nullable = false)
    private LocalDate assignedOn;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ReferralLead() {
    }

    public ReferralLead(Long referrerId, String externalId, Long submissionId, LocalDate assignedOn) {
        this.referrerId = referrerId;
        this.externalId = externalId;
        this.submissionId = submissionId;
        this.assignedOn = assignedOn;
    }

    public Long getId() { return id; }
    public Long getReferrerId() { return referrerId; }
    public String getExternalId() { return externalId; }
    public Long getSubmissionId() { return submissionId; }
    public LocalDate getAssignedOn() { return assignedOn; }
}
