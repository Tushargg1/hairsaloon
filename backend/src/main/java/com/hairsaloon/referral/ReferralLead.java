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

    @Column(name = "contact_status", nullable = false, length = 24,
        columnDefinition = "varchar(24) default 'NEW'")
    private String contactStatus = "NEW";

    @Column(name = "salon_name", length = 200)
    private String salonName;

    @Column(name = "salon_phone", length = 40)
    private String salonPhone;

    @Column(name = "salon_website", columnDefinition = "TEXT")
    private String salonWebsite;

    @Column(name = "salon_maps_url", columnDefinition = "TEXT")
    private String salonMapsUrl;

    @Column(name = "salon_location", length = 300)
    private String salonLocation;

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

    public void setSalonDetails(String name, String phone, String website, String mapsUrl, String location) {
        this.salonName = name;
        this.salonPhone = phone;
        this.salonWebsite = website;
        this.salonMapsUrl = mapsUrl;
        this.salonLocation = location;
    }

    public void setContactStatus(String status) {
        if (status != null && !status.isBlank()) this.contactStatus = status;
    }

    public Long getId() { return id; }
    public Long getReferrerId() { return referrerId; }
    public String getExternalId() { return externalId; }
    public Long getSubmissionId() { return submissionId; }
    public LocalDate getAssignedOn() { return assignedOn; }
    public String getContactStatus() { return contactStatus; }
    public String getSalonName() { return salonName; }
    public String getSalonPhone() { return salonPhone; }
    public String getSalonWebsite() { return salonWebsite; }
    public String getSalonMapsUrl() { return salonMapsUrl; }
    public String getSalonLocation() { return salonLocation; }
}
