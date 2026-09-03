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

    ReferralController(ReferralService service) {
        this.service = service;
    }

    @GetMapping("/me")
    ReferralService.Overview overview(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.overview(user.id());
    }

    @PostMapping
    ReferralService.SubmissionView submit(@AuthenticationPrincipal AuthenticatedUser user,
                                          @Valid @RequestBody SubmitRequest request) {
        return service.submit(user.id(), request.salonName(), request.salonPhone(),
            request.mapsUrl());
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record SubmitRequest(
        @NotBlank @Size(max = 160) String salonName,
        @NotBlank @Size(min = 10, max = 15) String salonPhone,
        @NotBlank @Size(max = 2048) String mapsUrl) {}
}
