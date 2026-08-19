package com.hairsaloon.tenantdata;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface PromotionRepository extends TenantScopedRepository<Promotion> {
    List<Promotion> findAllBySalonIdOrderByIdDesc(long salonId);
    Optional<Promotion> findByIdAndSalonId(long id, long salonId);
    Optional<Promotion> findBySalonIdAndCodeNormalized(long salonId, String codeNormalized);
    boolean existsBySalonIdAndCodeNormalizedAndIdNot(long salonId, String code, long id);
    Promotion save(Promotion promotion);
    Promotion saveAndFlush(Promotion promotion);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select promotion from Promotion promotion where promotion.salonId = :salonId "
        + "and promotion.codeNormalized = :code")
    Optional<Promotion> findForUpdate(@Param("salonId") long salonId,
                                      @Param("code") String code);
}

interface PromotionServiceEligibilityRepository
        extends TenantScopedRepository<PromotionServiceEligibility> {
    List<PromotionServiceEligibility> findAllBySalonIdAndPromotionIdOrderByServiceId(
        long salonId, long promotionId);
    boolean existsBySalonIdAndPromotionIdAndServiceId(
        long salonId, long promotionId, long serviceId);
    long countBySalonIdAndPromotionId(long salonId, long promotionId);
    @Modifying
    void deleteAllBySalonIdAndPromotionId(long salonId, long promotionId);
    <S extends PromotionServiceEligibility> List<S> saveAll(Iterable<S> values);
}

interface PromotionRedemptionRepository extends TenantScopedRepository<PromotionRedemption> {
    long countBySalonIdAndPromotionIdAndStatus(long salonId, long promotionId,
                                               PromotionRedemptionStatus status);
    long countBySalonIdAndPromotionIdAndCustomerIdAndStatus(
        long salonId, long promotionId, long customerId, PromotionRedemptionStatus status);
    PromotionRedemption saveAndFlush(PromotionRedemption redemption);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update PromotionRedemption redemption set redemption.status = 'RELEASED', "
        + "redemption.releasedAt = :releasedAt where redemption.salonId = :salonId "
        + "and redemption.bookingId = :bookingId and redemption.status = 'RESERVED'")
    int releaseReserved(@Param("salonId") long salonId,
        @Param("bookingId") long bookingId, @Param("releasedAt") Instant releasedAt);
}
