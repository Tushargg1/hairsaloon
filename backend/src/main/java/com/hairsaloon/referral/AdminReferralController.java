package com.hairsaloon.referral;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Platform-admin review of referrals (protected by /api/platform/admin/**). */
@RestController
@RequestMapping("/api/platform/admin/referrals")
class AdminReferralController {

    private final ReferralService service;

    AdminReferralController(ReferralService service) {
        this.service = service;
    }

    @GetMapping
    List<ReferralService.AdminSubmissionView> all() {
        return service.allSubmissions();
    }

    @PostMapping("/{id}/verify")
    ReferralService.AdminSubmissionView verify(@PathVariable long id,
                                               @Valid @RequestBody AmountRequest request) {
        return service.verify(id, request.amount());
    }

    @PostMapping("/{id}/reject")
    ReferralService.AdminSubmissionView reject(@PathVariable long id,
                                               @Valid @RequestBody RejectRequest request) {
        return service.reject(id, request.reason());
    }

    @PostMapping("/{id}/paid")
    ReferralService.AdminSubmissionView paid(@PathVariable long id) {
        return service.markPaid(id);
    }

    @PostMapping("/referrers/{userId}/approval")
    void approval(@PathVariable long userId, @Valid @RequestBody ApprovalRequest request) {
        service.setReferrerApproval(userId, Boolean.TRUE.equals(request.approved()), request.amount());
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record AmountRequest(@NotNull @DecimalMin("0.00") BigDecimal amount) {}

    @JsonIgnoreProperties(ignoreUnknown = false)
    record RejectRequest(@Size(max = 255) String reason) {}

    @JsonIgnoreProperties(ignoreUnknown = false)
    record ApprovalRequest(@NotNull Boolean approved,
                           @NotNull @DecimalMin("0.00") BigDecimal amount) {}
}
