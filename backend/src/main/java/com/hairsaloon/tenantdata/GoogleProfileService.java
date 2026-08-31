package com.hairsaloon.tenantdata;

import com.hairsaloon.google.GooglePlacesClient;
import com.hairsaloon.google.GooglePlacesClient.GooglePlaceData;
import com.hairsaloon.google.GooglePlacesClient.GoogleReviewData;
import com.hairsaloon.platform.InputPolicy;
import com.hairsaloon.platform.PlatformApiException;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import com.hairsaloon.tenant.TenantContext;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Imports a salon's public Google Business data. {@code preview} only fetches and
 * builds a before/after diff; {@code apply} persists it. Only 5-star reviews are kept.
 */
@Service
class GoogleProfileService {

    private static final String PHOTO_SOURCE = "GOOGLE";
    private static final int MAX_PHOTOS = 8;

    private final GooglePlacesClient places;
    private final SalonRepository salons;
    private final SalonPhotoRepository photos;
    private final GoogleReviewRepository reviews;

    GoogleProfileService(GooglePlacesClient places, SalonRepository salons,
                         SalonPhotoRepository photos, GoogleReviewRepository reviews) {
        this.places = places;
        this.salons = salons;
        this.photos = photos;
        this.reviews = reviews;
    }

    @Transactional(readOnly = true)
    Preview preview(String query) {
        Salon salon = currentSalon();
        GooglePlaceData data = fetch(query);
        List<GoogleReviewData> fiveStar = data.reviews().stream()
            .filter(review -> review.rating() == 5).toList();
        Changes changes = new Changes(
            new Change("rating", str(salon.getGoogleRating()), str(data.rating())),
            new Change("reviewCount", str(salon.getGoogleReviewCount()), str(data.reviewCount())),
            new Change("address", salon.getAddress(), data.address()),
            new Change("phone", salon.getPhone(), data.phone()));
        return new Preview(data.placeId(), data.name(), changes, fiveStar.size(),
            data.photoUrls().size(), fiveStar, data.photoUrls());
    }

    @Transactional
    Salon apply(String query, boolean overwriteContact) {
        Salon salon = currentSalon();
        long salonId = salon.getId();
        GooglePlaceData data = fetch(query);

        salon.applyGoogleProfile(data.placeId(), data.rating(), data.reviewCount(),
            data.mapsUri(), Instant.now());
        if (overwriteContact) {
            salon.applyGoogleContact(data.address(), data.phone());
        }
        salons.save(salon);

        reviews.deleteAllBySalonId(salonId);
        int reviewOrder = 0;
        for (GoogleReviewData review : data.reviews()) {
            if (review.rating() != 5) continue;
            reviews.save(new GoogleReview(salonId, review.authorName(), review.authorPhotoUrl(),
                (short) review.rating(), review.text(), review.relativeTime(),
                review.publishedAt(), reviewOrder++));
        }

        photos.deleteAllBySalonIdAndSource(salonId, PHOTO_SOURCE);
        int photoOrder = 0;
        for (String url : data.photoUrls()) {
            if (photoOrder >= MAX_PHOTOS) break;
            photos.save(new SalonPhoto(salonId, url, salon.getName() + " on Google",
                photoOrder++, PHOTO_SOURCE));
        }
        return salon;
    }

    private GooglePlaceData fetch(String query) {
        String cleaned = InputPolicy.text(query, 2048, "googleUrl", true);
        if (!places.enabled()) {
            throw new PlatformApiException(HttpStatus.SERVICE_UNAVAILABLE,
                "GOOGLE_NOT_CONFIGURED", "Google sync is not available right now");
        }
        try {
            return places.fetch(cleaned);
        } catch (IllegalArgumentException notFound) {
            throw new PlatformApiException(HttpStatus.NOT_FOUND, "GOOGLE_PLACE_NOT_FOUND",
                notFound.getMessage());
        } catch (IllegalStateException unavailable) {
            throw new PlatformApiException(HttpStatus.SERVICE_UNAVAILABLE,
                "GOOGLE_UNAVAILABLE", unavailable.getMessage());
        } catch (Exception failure) {
            throw new PlatformApiException(HttpStatus.BAD_GATEWAY, "GOOGLE_FETCH_FAILED",
                "Could not read the Google profile. Please try again.");
        }
    }

    private Salon currentSalon() {
        long salonId = TenantContext.requireSalonId();
        return salons.findById(salonId).orElseThrow(() -> InputPolicy.notFound("salon"));
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    record Change(String field, String current, String incoming) {}
    record Changes(Change rating, Change reviewCount, Change address, Change phone) {}
    record Preview(String placeId, String googleName, Changes changes, int fiveStarReviewCount,
                   int photoCount, List<GoogleReviewData> reviews, List<String> photoUrls) {}
}
