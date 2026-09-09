package com.hairsaloon.referral;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hairsaloon.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Referrer-facing endpoints: their code, earnings, history, and submitting referrals. */
@RestController
@RequestMapping("/api/platform/referrals")
class ReferralController {

    private final ReferralService service;
    private final ReferralLeadService leadService;
    private final ReferralSiteService siteService;

    ReferralController(ReferralService service, ReferralLeadService leadService,
                       ReferralSiteService siteService) {
        this.service = service;
        this.leadService = leadService;
        this.siteService = siteService;
    }

    /** Delivers the next batch of scraped salon leads to the referrer. */
    @PostMapping("/leads")
    ReferralLeadService.LeadBatch leads(@AuthenticationPrincipal AuthenticatedUser user) {
        return leadService.nextBatch(user);
    }

    /** Live lead-access status from the scraper (APPROVED / PENDING / REJECTED). */
    @GetMapping("/lead-access")
    ReferralLeadService.AccessStatus leadAccess(@AuthenticationPrincipal AuthenticatedUser user) {
        return leadService.accessStatus(user);
    }

    /** Re-sends the lead-access request (re-registers the code with the scraper). */
    @PostMapping("/lead-access/request")
    ReferralLeadService.AccessStatus requestLeadAccess(@AuthenticationPrincipal AuthenticatedUser user) {
        return leadService.requestAccess(user);
    }

    /** All leads delivered to this referrer (persisted), newest first. */
    @GetMapping("/leads/mine")
    java.util.List<ReferralLeadService.LeadView> myLeads(@AuthenticationPrincipal AuthenticatedUser user) {
        return leadService.myLeads(user.id());
    }

    /** Referrer sets their call-outcome status for a delivered lead. */
    @PostMapping("/leads/{leadId}/status")
    void setLeadStatus(@AuthenticationPrincipal AuthenticatedUser user,
                       @PathVariable long leadId, @Valid @RequestBody LeadStatusRequest request) {
        leadService.setLeadStatus(user.id(), leadId, request.status());
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record LeadStatusRequest(@NotBlank @Size(max = 24) String status) {}

    /** Creates a live trial preview site for this lead's salon and returns the login. */
    @PostMapping("/leads/{leadId}/site")
    ReferralSiteService.SiteView createSite(@AuthenticationPrincipal AuthenticatedUser user,
                                            @PathVariable long leadId) {
        return siteService.createTrialSite(user, leadId);
    }

    /** Permanently deletes the trial site (frees its URL for future reuse). */
    @DeleteMapping("/leads/{leadId}/site")
    void deleteSite(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable long leadId) {
        siteService.deleteTrialSite(user, leadId);
    }

    @GetMapping("/me")
    ReferralService.Overview overview(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.overview(user.id());
    }

    @PostMapping
    ReferralService.SubmissionView submit(@AuthenticationPrincipal AuthenticatedUser user,
                                          @Valid @RequestBody SubmitRequest request) {
        return service.submit(user.id(), request.salonName(), request.salonPhone(),
            request.mapsUrl(), request.contactName(), request.salonAddress());
    }


    @JsonIgnoreProperties(ignoreUnknown = false)
    record SubmitRequest(
        @NotBlank @Size(max = 160) String salonName,
        @NotBlank @Size(min = 10, max = 15) String salonPhone,
        @NotBlank @Size(max = 2048) String mapsUrl,
        @Size(max = 160) String contactName,
        @Size(max = 500) String salonAddress) {}
}
