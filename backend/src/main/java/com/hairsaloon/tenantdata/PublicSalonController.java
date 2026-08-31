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
            salon.getStatus().name(),
            salon.getCancellationWindowMinutes(), salon.getInstagramUrl(),
            salon.getFacebookUrl(), salon.getWhatsappUrl(), salon.getYoutubeUrl(),
            salon.getMapsUrl(), salon.getGoogleRating(), salon.getGoogleReviewCount(),
            salon.getGoogleMapsUri(), salon.getCategoryOrder(), profile.photos().stream()
                .map(photo -> new PhotoResponse(photo.getId(), photo.getPhotoUrl(),
                    photo.getAltText(), photo.getSortOrder())).toList());
    }

    @GetMapping("/google-reviews")
    List<GoogleReviewResponse> googleReviews() {
        return service.googleReviews().stream()
            .map(review -> new GoogleReviewResponse(review.getAuthorName(),
                review.getAuthorPhotoUrl(), review.getRating(), review.getText(),
                review.getRelativeTime()))
            .toList();
    }

    @GetMapping("/services")
    List<ServiceResponse> services() {
        return service.activeServices().stream().map(PublicSalonController::response).toList();
    }

    @GetMapping("/staff")
    List<StaffResponse> staff() {
        return service.activeStaff().stream().map(view -> new StaffResponse(
            view.staff().getId(), view.staff().getName(), view.staff().getPhotoUrl(),
            view.staff().getCharacterKey(), view.serviceIds())).toList();
    }

    private static ServiceResponse response(SalonServiceEntity service) {
        return new ServiceResponse(service.getId(), service.getName(),
            service.getDurationMinutes(), service.getPrice(), service.getCategory());
    }

    record ProfileResponse(Long id, String subdomain, String name, String description,
                           String address, String city, String phone, String email,
                           String logoUrl, String timezone, String status,
                           int cancellationWindowMinutes,
                           String instagramUrl, String facebookUrl, String whatsappUrl,
                           String youtubeUrl, String mapsUrl, BigDecimal googleRating,
                           Integer googleReviewCount, String googleMapsUri,
                           List<String> categoryOrder, List<PhotoResponse> photos) {}
    record GoogleReviewResponse(String authorName, String authorPhotoUrl, short rating,
                                String text, String relativeTime) {}
    record PhotoResponse(Long id, String photoUrl, String altText, int sortOrder) {}
    record ServiceResponse(Long id, String name, int durationMinutes, BigDecimal price,
                           String category) {}
    record StaffResponse(Long id, String name, String photoUrl, String characterKey,
                         List<Long> serviceIds) {}
}
