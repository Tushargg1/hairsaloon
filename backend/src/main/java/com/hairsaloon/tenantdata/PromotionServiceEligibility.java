package com.hairsaloon.tenantdata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;

@Entity
@Table(name = "promotion_services")
@IdClass(PromotionServiceEligibility.Key.class)
public class PromotionServiceEligibility {
    @Id @Column(name = "salon_id") private Long salonId;
    @Id @Column(name = "promotion_id") private Long promotionId;
    @Id @Column(name = "service_id") private Long serviceId;

    protected PromotionServiceEligibility() {}

    PromotionServiceEligibility(long salonId, long promotionId, long serviceId) {
        this.salonId = salonId;
        this.promotionId = promotionId;
        this.serviceId = serviceId;
    }

    public Long getServiceId() { return serviceId; }

    public static class Key implements Serializable {
        public Long salonId;
        public Long promotionId;
        public Long serviceId;
        public Key() {}
        public boolean equals(Object value) {
            if (!(value instanceof Key other)) return false;
            return java.util.Objects.equals(salonId, other.salonId)
                && java.util.Objects.equals(promotionId, other.promotionId)
                && java.util.Objects.equals(serviceId, other.serviceId);
        }
        public int hashCode() { return java.util.Objects.hash(salonId, promotionId, serviceId); }
    }
}
