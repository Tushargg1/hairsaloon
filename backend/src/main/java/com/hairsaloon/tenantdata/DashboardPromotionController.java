package com.hairsaloon.tenantdata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hairsaloon.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/salon/dashboard/promotions")
class DashboardPromotionController {
    private final SalonOwnershipVerifier ownership;
    private final PromotionService promotions;

    DashboardPromotionController(SalonOwnershipVerifier ownership, PromotionService promotions) {
        this.ownership = ownership;
        this.promotions = promotions;
    }

    @GetMapping
    List<PromotionService.PromotionView> list(@AuthenticationPrincipal AuthenticatedUser user) {
        ownership.verifyOwner(user);
        return promotions.list();
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    PromotionService.PromotionView create(@AuthenticationPrincipal AuthenticatedUser user,
                                          @Valid @RequestBody PromotionRequest request) {
        ownership.verifyOwner(user);
        return promotions.create(request.command());
    }
    @PutMapping("/{id}")
    PromotionService.PromotionView update(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable long id, @Valid @RequestBody PromotionRequest request) {
        ownership.verifyOwner(user);
        return promotions.update(id, request.command());
    }

    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable long id) {
        ownership.verifyOwner(user);
        promotions.deactivate(id);
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record PromotionRequest(@NotBlank String code,
        @NotNull PromotionDiscountType discountType,
        @NotNull BigDecimal discountValue,
        @NotNull Instant startsAt, @NotNull Instant endsAt,
        @Positive Integer totalLimit, @Positive Integer perCustomerLimit,
        BigDecimal minimumSpend, Boolean active, List<@Positive Long> serviceIds) {
        PromotionService.PromotionCommand command() {
            return new PromotionService.PromotionCommand(code, discountType, discountValue,
                startsAt, endsAt, totalLimit, perCustomerLimit, minimumSpend,
                active == null || active, serviceIds);
        }
    }
}
