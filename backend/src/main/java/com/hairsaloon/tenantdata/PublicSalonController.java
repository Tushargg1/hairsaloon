package com.hairsaloon.tenantdata;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/salon")
class PublicSalonController {
    private final PublicSalonService service;

    PublicSalonController(PublicSalonService service) {
        this.service = service;
    }

    @GetMapping("/profile")
    ProfileResponse profile() {
        PublicSalonService.Profile profile = service.profile();
        var salon = profile.salon();
        return new ProfileResponse(salon.getId(), salon.getSubdomain(), salon.getName(),
            salon.getDescription(), salon.getAddress(), salon.getCity(), salon.getPhone(),
            salon.getEmail(), salon.getLogoUrl(), salon.getTimezone(),
            salon.getCancellationWindowMinutes(), profile.photos().stream()
                .map(photo -> new PhotoResponse(photo.getId(), photo.getPhotoUrl(),
                    photo.getAltText(), photo.getSortOrder())).toList());
    }

    @GetMapping("/services")
    List<ServiceResponse> services() {
        return service.activeServices().stream().map(PublicSalonController::response).toList();
    }

    @GetMapping("/staff")
    List<StaffResponse> staff() {
        return service.activeStaff().stream().map(view -> new StaffResponse(
            view.staff().getId(), view.staff().getName(), view.staff().getPhotoUrl(),
            view.serviceIds())).toList();
    }

    private static ServiceResponse response(SalonServiceEntity service) {
        return new ServiceResponse(service.getId(), service.getName(),
            service.getDurationMinutes(), service.getPrice(), service.getCategory());
    }

    record ProfileResponse(Long id, String subdomain, String name, String description,
                           String address, String city, String phone, String email,
                           String logoUrl, String timezone, int cancellationWindowMinutes,
                           List<PhotoResponse> photos) {}
    record PhotoResponse(Long id, String photoUrl, String altText, int sortOrder) {}
    record ServiceResponse(Long id, String name, int durationMinutes, BigDecimal price,
                           String category) {}
    record StaffResponse(Long id, String name, String photoUrl, List<Long> serviceIds) {}
}
