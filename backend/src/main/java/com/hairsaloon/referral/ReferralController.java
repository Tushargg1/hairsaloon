package com.hairsaloon.referral;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hairsaloon.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
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

    ReferralController(ReferralService service, ReferralLeadService leadService) {
        this.service = service;
        this.leadService = leadService;
    }

    /** Delivers the next batch of scraped salon leads to the referrer. */
    @PostMapping("/leads")
    ReferralLeadService.LeadBatch leads(@AuthenticationPrincipal AuthenticatedUser user) {
        return leadService.nextBatch(user);
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
