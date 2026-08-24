package com.hairsaloon.tenantdata;

import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.auth.UserRole;
import com.hairsaloon.platform.InputPolicy;
import com.hairsaloon.platform.PlatformApiException;
import com.hairsaloon.tenant.TenantContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PromotionService {
    private final PromotionRepository promotions;
    private final PromotionServiceEligibilityRepository eligibility;
    private final PromotionRedemptionRepository redemptions;
    private final SalonServiceRepository services;

    PromotionService(PromotionRepository promotions,
                     PromotionServiceEligibilityRepository eligibility,
                     PromotionRedemptionRepository redemptions,
                     SalonServiceRepository services) {
        this.promotions = promotions;
        this.eligibility = eligibility;
        this.redemptions = redemptions;
        this.services = services;
    }

    @Transactional(readOnly = true)
    List<PromotionView> list() {
        long salonId = TenantContext.requireSalonId();
        return promotions.findAllBySalonIdOrderByIdDesc(salonId).stream()
            .map(value -> view(salonId, value)).toList();
    }

    /** Live offers for the public salon page: active and inside their date window. */
    @Transactional(readOnly = true)
    List<PublicPromotionView> publicList(Instant now) {
        long salonId = TenantContext.requireSalonId();
        return promotions.findAllBySalonIdOrderByIdDesc(salonId).stream()
            .filter(Promotion::isActive)
            .filter(value -> value.getStartsAt() == null || !value.getStartsAt().isAfter(now))
            .filter(value -> value.getEndsAt() == null || value.getEndsAt().isAfter(now))
            .map(value -> new PublicPromotionView(value.getCode(), value.getDiscountType(),
                value.getDiscountValue(), value.getEndsAt(), value.getMinimumSpend(),
                eligibility.findAllBySalonIdAndPromotionIdOrderByServiceId(salonId, value.getId())
                    .stream().map(PromotionServiceEligibility::getServiceId).toList()))
            .toList();
    }

    @Transactional
    PromotionView create(PromotionCommand command) {
        long salonId = TenantContext.requireSalonId();
        Validated input = validateCommand(salonId, command, null);
        try {
            Promotion saved = promotions.saveAndFlush(new Promotion(salonId, input.code(),
                input.normalized(), input.type(), input.value(), input.startsAt(), input.endsAt(),
                input.totalLimit(), input.customerLimit(), input.minimumSpend(), input.active()));
            replaceServices(salonId, saved.getId(), input.serviceIds());
            return view(salonId, saved);
        } catch (DataIntegrityViolationException duplicate) {
            throw InputPolicy.conflict("PROMOTION_CODE_EXISTS",
                "A promotion with this code already exists");
        }
    }
    @Transactional
    PromotionView update(long id, PromotionCommand command) {
        long salonId = TenantContext.requireSalonId();
        Promotion promotion = promotions.findByIdAndSalonId(id, salonId)
            .orElseThrow(() -> InputPolicy.notFound("promotion"));
        Validated input = validateCommand(salonId, command, id);
        promotion.update(input.code(), input.normalized(), input.type(), input.value(),
            input.startsAt(), input.endsAt(), input.totalLimit(), input.customerLimit(),
            input.minimumSpend(), input.active());
        try {
            promotions.saveAndFlush(promotion);
            replaceServices(salonId, id, input.serviceIds());
            return view(salonId, promotion);
        } catch (DataIntegrityViolationException duplicate) {
            throw InputPolicy.conflict("PROMOTION_CODE_EXISTS",
                "A promotion with this code already exists");
        }
    }

    @Transactional
    void deactivate(long id) {
        long salonId = TenantContext.requireSalonId();
        Promotion promotion = promotions.findByIdAndSalonId(id, salonId)
            .orElseThrow(() -> InputPolicy.notFound("promotion"));
        promotion.deactivate();
        promotions.save(promotion);
    }

    @Transactional(readOnly = true)
    Quote validateForCustomer(AuthenticatedUser user, String code, long serviceId) {
        requireCustomer(user);
        long salonId = TenantContext.requireSalonId();
        SalonServiceEntity service = service(salonId, serviceId);
        Promotion promotion = promotions.findBySalonIdAndCodeNormalized(salonId, normalizeCode(code))
            .orElseThrow(PromotionService::invalidPromotion);
        return quote(salonId, promotion, user.id(), service);
    }

    Quote quoteForBooking(long salonId, long customerId, String code,
                          SalonServiceEntity service) {
        if (code == null || code.isBlank()) return Quote.none(service.getPrice());
        Promotion promotion = promotions.findForUpdate(salonId, normalizeCode(code))
            .orElseThrow(PromotionService::invalidPromotion);
        return quote(salonId, promotion, customerId, service);
    }

    void reserve(long salonId, long customerId, long bookingId, Quote quote) {
        if (quote.promotion() == null) return;
        redemptions.saveAndFlush(new PromotionRedemption(salonId,
            quote.promotion().getId(), bookingId, customerId, quote.discountAmount()));
    }

    void release(long salonId, long bookingId, Instant releasedAt) {
        redemptions.releaseReserved(salonId, bookingId, releasedAt);
    }
    private Quote quote(long salonId, Promotion promotion, long customerId,
                        SalonServiceEntity service) {
        Instant now = Instant.now();
        if (!promotion.isActive() || now.isBefore(promotion.getStartsAt())
                || now.isAfter(promotion.getEndsAt())) throw invalidPromotion();
        // Combos are a bundle price across several services, so there is no
        // single-service discount to quote.
        if (promotion.getDiscountType() == PromotionDiscountType.COMBO)
            throw InputPolicy.conflict("PROMOTION_COMBO_NOT_REDEEMABLE",
                "This combo is booked by selecting its services, not with a code");
        if (service.getPrice().compareTo(promotion.getMinimumSpend()) < 0)
            throw InputPolicy.conflict("PROMOTION_MINIMUM_SPEND",
                "The booking does not meet the promotion minimum spend");
        long eligibleCount = eligibility.countBySalonIdAndPromotionId(
            salonId, promotion.getId());
        if (eligibleCount > 0 && !eligibility.existsBySalonIdAndPromotionIdAndServiceId(
                salonId, promotion.getId(), service.getId()))
            throw InputPolicy.conflict("PROMOTION_SERVICE_INELIGIBLE",
                "The promotion does not apply to this service");
        long total = redemptions.countBySalonIdAndPromotionIdAndStatus(
            salonId, promotion.getId(), PromotionRedemptionStatus.RESERVED);
        if (promotion.getTotalLimit() != null && total >= promotion.getTotalLimit())
            throw InputPolicy.conflict("PROMOTION_LIMIT_REACHED",
                "The promotion redemption limit has been reached");
        long customerTotal = redemptions.countBySalonIdAndPromotionIdAndCustomerIdAndStatus(
            salonId, promotion.getId(), customerId, PromotionRedemptionStatus.RESERVED);
        if (promotion.getPerCustomerLimit() != null
                && customerTotal >= promotion.getPerCustomerLimit())
            throw InputPolicy.conflict("PROMOTION_CUSTOMER_LIMIT_REACHED",
                "The customer redemption limit has been reached");
        BigDecimal original = money(service.getPrice());
        BigDecimal discount = promotion.getDiscountType() == PromotionDiscountType.PERCENT
            ? original.multiply(promotion.getDiscountValue())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
            : money(promotion.getDiscountValue()).min(original);
        discount = money(discount);
        return new Quote(promotion, original, discount, original.subtract(discount),
            promotion.getCode());
    }

    private Validated validateCommand(long salonId, PromotionCommand command, Long existingId) {
        if (command == null) throw InputPolicy.validation("promotion", "is required");
        String normalized = normalizeCode(command.code());
        String code = normalized;
        if (existingId != null && promotions.existsBySalonIdAndCodeNormalizedAndIdNot(
                salonId, normalized, existingId))
            throw InputPolicy.conflict("PROMOTION_CODE_EXISTS",
                "A promotion with this code already exists");
        if (command.type() == null)
            throw InputPolicy.validation("discountType", "is required");
        BigDecimal value = moneyRequired(command.value(), "discountValue");
        if (value.signum() <= 0 || (command.type() == PromotionDiscountType.PERCENT
                && value.compareTo(BigDecimal.valueOf(100)) > 0))
            throw InputPolicy.validation("discountValue",
                "must be positive and percent discounts must not exceed 100");
        if (command.startsAt() == null || command.endsAt() == null
                || !command.startsAt().isBefore(command.endsAt()))
            throw InputPolicy.validation("endsAt", "must be after startsAt");
        positiveLimit(command.totalLimit(), "totalLimit");
        positiveLimit(command.customerLimit(), "perCustomerLimit");
        BigDecimal minimum = command.minimumSpend() == null ? BigDecimal.ZERO
            : money(command.minimumSpend());
        if (minimum.signum() < 0)
            throw InputPolicy.validation("minimumSpend", "must not be negative");
        List<Long> ids = command.serviceIds() == null ? List.of()
            : new ArrayList<>(new LinkedHashSet<>(command.serviceIds()));
        if (ids.stream().anyMatch(id -> id == null || id <= 0)
                || services.findAllByIdInAndSalonIdAndActiveTrue(ids, salonId).size() != ids.size())
            throw InputPolicy.validation("serviceIds",
                "must contain only active services in this salon");
        if (command.type() == PromotionDiscountType.COMBO && ids.size() < 2)
            throw InputPolicy.validation("serviceIds",
                "a combo must include at least two services");
        return new Validated(code, normalized, command.type(), value, command.startsAt(),
            command.endsAt(), command.totalLimit(), command.customerLimit(), minimum,
            command.active(), ids);
    }

    private void replaceServices(long salonId, long promotionId, List<Long> serviceIds) {
        eligibility.deleteAllBySalonIdAndPromotionId(salonId, promotionId);
        eligibility.saveAll(serviceIds.stream().map(id ->
            new PromotionServiceEligibility(salonId, promotionId, id)).toList());
    }

    private PromotionView view(long salonId, Promotion value) {
        List<Long> serviceIds = eligibility
            .findAllBySalonIdAndPromotionIdOrderByServiceId(salonId, value.getId())
            .stream().map(PromotionServiceEligibility::getServiceId).toList();
        return new PromotionView(value.getId(), value.getCode(), value.getDiscountType(),
            value.getDiscountValue(), value.getStartsAt(), value.getEndsAt(),
            value.getTotalLimit(), value.getPerCustomerLimit(), value.getMinimumSpend(),
            value.isActive(), serviceIds, value.getCreatedAt(), value.getUpdatedAt());
    }

    private SalonServiceEntity service(long salonId, long serviceId) {
        if (serviceId <= 0) throw InputPolicy.validation("serviceId", "must be positive");
        return services.findByIdAndSalonId(serviceId, salonId)
            .filter(SalonServiceEntity::isActive)
            .orElseThrow(() -> InputPolicy.notFound("service"));
    }
    private static String normalizeCode(String input) {
        String value = InputPolicy.text(input, 40, "promoCode", true)
            .toUpperCase(Locale.ROOT);
        if (!value.matches("[A-Z0-9][A-Z0-9_-]{1,39}"))
            throw InputPolicy.validation("promoCode",
                "must contain 2 to 40 letters, numbers, underscores, or hyphens");
        return value;
    }

    private static BigDecimal moneyRequired(BigDecimal value, String field) {
        if (value == null) throw InputPolicy.validation(field, "is required");
        return money(value);
    }

    private static BigDecimal money(BigDecimal value) {
        try { return value.setScale(2, RoundingMode.UNNECESSARY); }
        catch (ArithmeticException invalid) {
            throw InputPolicy.validation("amount", "must have at most 2 decimal places");
        }
    }

    private static void positiveLimit(Integer value, String field) {
        if (value != null && value <= 0)
            throw InputPolicy.validation(field, "must be positive");
    }

    private static PlatformApiException invalidPromotion() {
        return InputPolicy.conflict("PROMOTION_INVALID",
            "The promotion is invalid or outside its active window");
    }

    private static void requireCustomer(AuthenticatedUser user) {
        if (user == null || user.role() != UserRole.CUSTOMER)
            throw new PlatformApiException(HttpStatus.FORBIDDEN, "FORBIDDEN",
                "Customer access is required");
    }

    record PromotionCommand(String code, PromotionDiscountType type, BigDecimal value,
        Instant startsAt, Instant endsAt, Integer totalLimit, Integer customerLimit,
        BigDecimal minimumSpend, boolean active, List<Long> serviceIds) {}
    record PublicPromotionView(String code, PromotionDiscountType discountType,
        BigDecimal discountValue, Instant endsAt, BigDecimal minimumSpend,
        List<Long> serviceIds) {}
    record PromotionView(Long id, String code, PromotionDiscountType discountType,
        BigDecimal discountValue, Instant startsAt, Instant endsAt, Integer totalLimit,
        Integer perCustomerLimit, BigDecimal minimumSpend, boolean active,
        List<Long> serviceIds, Instant createdAt, Instant updatedAt) {}
    record Quote(Promotion promotion, BigDecimal originalPrice, BigDecimal discountAmount,
        BigDecimal finalPrice, String promoCode) {
        static Quote none(BigDecimal price) {
            BigDecimal money = price.setScale(2, RoundingMode.HALF_UP);
            return new Quote(null, money, BigDecimal.ZERO.setScale(2), money, null);
        }
    }
    private record Validated(String code, String normalized, PromotionDiscountType type,
        BigDecimal value, Instant startsAt, Instant endsAt, Integer totalLimit,
        Integer customerLimit, BigDecimal minimumSpend, boolean active,
        List<Long> serviceIds) {}
}
