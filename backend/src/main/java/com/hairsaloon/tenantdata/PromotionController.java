package com.hairsaloon.tenantdata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hairsaloon.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/salon/promotions")
class PromotionController {
    private final PromotionService promotions;

    PromotionController(PromotionService promotions) { this.promotions = promotions; }

    @PostMapping("/validate")
    ValidationResponse validate(@AuthenticationPrincipal AuthenticatedUser user,
                                @Valid @RequestBody ValidationRequest request) {
        PromotionService.Quote quote = promotions.validateForCustomer(
            user, request.promoCode(), request.serviceId());
        return new ValidationResponse(true, quote.promoCode(), quote.originalPrice(),
            quote.discountAmount(), quote.finalPrice());
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record ValidationRequest(@NotBlank String promoCode, @NotNull @Positive Long serviceId) {}
    record ValidationResponse(boolean valid, String promoCode, BigDecimal originalPrice,
                              BigDecimal discountAmount, BigDecimal finalPrice) {}
}
