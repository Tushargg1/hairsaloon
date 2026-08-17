package com.hairsaloon.tenantdata;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "staff_services")
@IdClass(StaffService.Key.class)
public class StaffService {
    @Id @Column(name = "salon_id", nullable = false)
    private Long salonId;
    @Id @Column(name = "staff_id", nullable = false)
    private Long staffId;
    @Id @Column(name = "service_id", nullable = false)
    private Long serviceId;

    protected StaffService() {}

    public StaffService(long salonId, long staffId, long serviceId) {
        this.salonId = salonId;
        this.staffId = staffId;
        this.serviceId = serviceId;
    }

    public Long getServiceId() { return serviceId; }

    public static class Key implements Serializable {
        public Long salonId;
        public Long staffId;
        public Long serviceId;
        public Key() {}
        @Override public boolean equals(Object other) {
            if (!(other instanceof Key key)) return false;
            return Objects.equals(salonId, key.salonId) && Objects.equals(staffId, key.staffId)
                && Objects.equals(serviceId, key.serviceId);
        }
        @Override public int hashCode() { return Objects.hash(salonId, staffId, serviceId); }
    }
}
