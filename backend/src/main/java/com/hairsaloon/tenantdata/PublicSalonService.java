package com.hairsaloon.tenantdata;

import com.hairsaloon.platform.InputPolicy;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import com.hairsaloon.tenant.TenantContext;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PublicSalonService {
    private final SalonRepository salons;
    private final SalonPhotoRepository photos;
    private final SalonServiceRepository services;
    private final SalonStaffRepository staff;
    private final StaffServiceRepository assignments;
    private final GoogleReviewRepository googleReviews;

    PublicSalonService(SalonRepository salons, SalonPhotoRepository photos,
                       SalonServiceRepository services, SalonStaffRepository staff,
                       StaffServiceRepository assignments, GoogleReviewRepository googleReviews) {
        this.salons = salons;
        this.photos = photos;
        this.services = services;
        this.staff = staff;
        this.assignments = assignments;
        this.googleReviews = googleReviews;
    }

    @Transactional(readOnly = true)
    List<GoogleReview> googleReviews() {
        return googleReviews.findAllBySalonIdOrderBySortOrderAsc(TenantContext.requireSalonId());
    }

    @Transactional(readOnly = true)
    Profile profile() {
        long salonId = TenantContext.requireSalonId();
        Salon salon = salons.findById(salonId).orElseThrow(() ->
            InputPolicy.notFound("salon"));
        return new Profile(salon, photos.findAllBySalonIdOrderBySortOrderAsc(salonId));
    }

    @Transactional(readOnly = true)
    List<SalonServiceEntity> activeServices() {
        return services.findAllBySalonIdAndActiveTrueOrderByIdAsc(
            TenantContext.requireSalonId());
    }

    @Transactional(readOnly = true)
    List<StaffView> activeStaff() {
        long salonId = TenantContext.requireSalonId();
        return staff.findAllBySalonIdAndActiveTrueOrderByIdAsc(salonId).stream()
            .map(member -> new StaffView(member,
                assignments.findActiveServiceIds(salonId, member.getId())))
            .toList();
    }

    record Profile(Salon salon, List<SalonPhoto> photos) {}
    record StaffView(SalonStaff staff, List<Long> serviceIds) {}
}
