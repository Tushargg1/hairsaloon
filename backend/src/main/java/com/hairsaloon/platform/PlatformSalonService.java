package com.hairsaloon.platform;

import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.platform.PlatformSalonQueryRepository.DirectoryResult;
import com.hairsaloon.platform.PlatformSalonQueryRepository.GeoFilter;
import com.hairsaloon.platform.SalonDtos.PageResponse;
import com.hairsaloon.platform.SalonDtos.PendingSalonResponse;
import com.hairsaloon.platform.SalonDtos.SalonResponse;
import com.hairsaloon.platform.SalonDtos.SubdomainResponse;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import com.hairsaloon.tenant.SalonStatus;
import java.math.BigDecimal;
import java.net.URI;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PlatformSalonService {

    private static final BigDecimal ZERO_RATING = BigDecimal.ZERO.setScale(2);
    private final SalonRepository salons;
    private final PlatformSalonQueryRepository queries;

    PlatformSalonService(SalonRepository salons, PlatformSalonQueryRepository queries) {
        this.salons = salons;
        this.queries = queries;
    }

    private static final double DEFAULT_RADIUS_KM = 10;
    private static final double MAX_RADIUS_KM = 100;

    @Transactional(readOnly = true)
    PageResponse<SalonResponse> directory(String city, String service, String rating,
                                          String search, String page, String size,
                                          String latitude, String longitude,
                                          String radiusKm) {
        int pageNumber = integer(page, "page", 0, Integer.MAX_VALUE, 0);
        int pageSize = integer(size, "size", 1, 100, 20);
        BigDecimal minimumRating = rating(rating);
        DirectoryResult result = queries.findDirectory(
            normalizedFilter(city, 120, "city"),
            likeFilter(service, 160, "service"), minimumRating,
            likeFilter(search, 200, "search"), pageNumber, pageSize,
            geoFilter(latitude, longitude, radiusKm));
        return PageResponse.of(result.salons(), pageNumber, pageSize, result.total());
    }

    /**
     * Builds the proximity constraint. Latitude and longitude must be supplied together;
     * a lone value is a client bug worth surfacing rather than silently ignoring.
     */
    private static GeoFilter geoFilter(String latitude, String longitude, String radiusKm) {
        boolean hasLat = latitude != null && !latitude.isBlank();
        boolean hasLng = longitude != null && !longitude.isBlank();
        if (!hasLat && !hasLng) {
            return GeoFilter.NONE;
        }
        if (hasLat != hasLng) {
            throw validation(hasLat ? "longitude" : "latitude",
                "is required when searching by location");
        }
        BigDecimal lat = coordinate(latitude, "latitude", 90);
        BigDecimal lng = coordinate(longitude, "longitude", 180);
        double radius = DEFAULT_RADIUS_KM;
        if (radiusKm != null && !radiusKm.isBlank()) {
            try {
                radius = Double.parseDouble(radiusKm.trim());
            } catch (NumberFormatException invalid) {
                throw validation("radiusKm", "must be a number");
            }
            if (!(radius > 0) || radius > MAX_RADIUS_KM) {
                throw validation("radiusKm",
                    "must be greater than 0 and at most " + (int) MAX_RADIUS_KM);
            }
        }
        return new GeoFilter(lat, lng, radius);
    }

    private static BigDecimal coordinate(String input, String field, int bound) {
        try {
            BigDecimal value = new BigDecimal(input.trim());
            if (value.abs().compareTo(BigDecimal.valueOf(bound)) > 0) {
                throw validation(field, "must be between -" + bound + " and " + bound);
            }
            return value;
        } catch (NumberFormatException invalid) {
            throw validation(field, "must be a decimal number");
        }
    }

    @Transactional(readOnly = true)
    SubdomainResponse checkSubdomain(String input) {
        SubdomainPolicy.Result result = SubdomainPolicy.inspect(input);
        if (!result.valid()) {
            if (result.reserved()) {
                return new SubdomainResponse(result.normalized(), false, false, "RESERVED");
            }
            throw validation("name", result.error());
        }
        if (result.reserved()) {
            return new SubdomainResponse(result.normalized(), false, false, "RESERVED");
        }
        boolean available = !salons.existsBySubdomain(result.normalized());
        return new SubdomainResponse(result.normalized(), true, available,
            available ? "AVAILABLE" : "TAKEN");
    }

    @Transactional
    SalonResponse create(AuthenticatedUser owner, String subdomain, String name,
                         String description, String address, String city, String phone,
                         String email, String logoUrl, String timezone,
                         BigDecimal latitude, BigDecimal longitude) {
        SubdomainPolicy.Result candidate = SubdomainPolicy.inspect(subdomain);
        if (!candidate.valid() || candidate.reserved()) {
            throw validation("subdomain", candidate.reserved()
                ? "is reserved" : candidate.error());
        }
        if (salons.existsByOwnerId(owner.id())) {
            throw conflict("OWNER_SALON_EXISTS", "This owner already has a salon");
        }
        if (salons.existsBySubdomain(candidate.normalized())) {
            throw conflict("SUBDOMAIN_TAKEN", "This subdomain is already taken");
        }
        if ((latitude == null) != (longitude == null)) {
            throw validation(latitude == null ? "latitude" : "longitude",
                "must be supplied together with the other coordinate");
        }
        if (latitude != null && latitude.abs().compareTo(BigDecimal.valueOf(90)) > 0) {
            throw validation("latitude", "must be between -90 and 90");
        }
        if (longitude != null && longitude.abs().compareTo(BigDecimal.valueOf(180)) > 0) {
            throw validation("longitude", "must be between -180 and 180");
        }
        Salon salon = new Salon(owner.id(), candidate.normalized(),
            text(name, 160, "name", true), text(description, 5000, "description", false),
            text(address, 500, "address", true), text(city, 120, "city", true),
            phone(phone), email(email), logoUrl(logoUrl), timezone(timezone),
            latitude, longitude);
        try {
            return response(salons.saveAndFlush(salon));
        } catch (DataIntegrityViolationException uniqueRace) {
            throw conflict("SALON_CONFLICT",
                "A salon already exists for this owner or subdomain");
        }
    }
    @Transactional(readOnly = true)
    List<PendingSalonResponse> pending() {
        return List.copyOf(queries.findPending());
    }

    @Transactional
    SalonResponse approve(long id) {
        Salon salon = salons.findById(id).orElseThrow(() ->
            new PlatformApiException(HttpStatus.NOT_FOUND, "SALON_NOT_FOUND",
                "Salon was not found"));
        if (salon.getStatus() != SalonStatus.PENDING) {
            throw conflict("INVALID_SALON_STATUS", "Only pending salons can be approved");
        }
        salon.approve();
        return response(salons.saveAndFlush(salon));
    }

    private static SalonResponse response(Salon salon) {
        return new SalonResponse(salon.getId(), salon.getSubdomain(), salon.getName(),
            salon.getDescription(), salon.getAddress(), salon.getCity(), salon.getPhone(),
            salon.getEmail(), salon.getLogoUrl(), salon.getTimezone(), salon.getStatus(),
            ZERO_RATING, 0, salon.getLatitude(), salon.getLongitude(), null,
            salon.getCreatedAt());
    }

    private static int integer(String input, String field, int min, int max, int fallback) {
        if (input == null || input.isBlank()) {
            return fallback;
        }
        try {
            int value = Integer.parseInt(input.trim());
            if (value < min || value > max) {
                throw validation(field, "must be between " + min + " and " + max);
            }
            return value;
        } catch (NumberFormatException invalid) {
            throw validation(field, "must be a whole number");
        }
    }

    private static BigDecimal rating(String input) {
        if (input == null || input.isBlank()) {
            return BigDecimal.ZERO;
        }
        try {
            BigDecimal value = new BigDecimal(input.trim());
            if (value.compareTo(BigDecimal.ONE) < 0
                    || value.compareTo(BigDecimal.valueOf(5)) > 0) {
                throw validation("rating", "must be between 1 and 5");
            }
            return value;
        } catch (NumberFormatException invalid) {
            throw validation("rating", "must be a number between 1 and 5");
        }
    }

    private static String normalizedFilter(String value, int max, String field) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() > max) {
            throw validation(field, "must not exceed " + max + " characters");
        }
        return normalized;
    }

    private static String likeFilter(String value, int max, String field) {
        return normalizedFilter(value, max, field);
    }
    private static String text(String value, int max, String field, boolean required) {
        String cleaned = value == null ? "" : value.replaceAll("(?s)<[^>]*>", "")
            .chars().filter(character -> !Character.isISOControl(character)
                || character == '\n' || character == '\t')
            .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append)
            .toString().trim();
        if (required && cleaned.isBlank()) {
            throw validation(field, "must not be blank");
        }
        if (cleaned.length() > max) {
            throw validation(field, "must not exceed " + max + " characters");
        }
        return cleaned.isBlank() ? null : cleaned;
    }

    private static String phone(String input) {
        String value = text(input, 32, "phone", false);
        if (value != null && !value.matches("[+0-9() .-]{7,32}")) {
            throw validation("phone", "must be a valid phone number");
        }
        return value;
    }

    private static String email(String input) {
        String value = text(input, 320, "email", false);
        if (value == null) {
            return null;
        }
        value = value.toLowerCase(Locale.ROOT);
        if (!value.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw validation("email", "must be a valid email address");
        }
        return value;
    }

    private static String logoUrl(String input) {
        String value = text(input, 2048, "logoUrl", false);
        if (value == null) {
            return null;
        }
        try {
            URI uri = URI.create(value);
            if (!("http".equalsIgnoreCase(uri.getScheme())
                    || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null || uri.getUserInfo() != null) {
                throw new IllegalArgumentException();
            }
            return uri.toASCIIString();
        } catch (IllegalArgumentException invalid) {
            throw validation("logoUrl", "must be an absolute HTTP or HTTPS URL");
        }
    }

    private static String timezone(String input) {
        String value = text(input, 64, "timezone", true);
        if (!ZoneId.getAvailableZoneIds().contains(value)) {
            throw validation("timezone", "must be a recognized IANA timezone");
        }
        return value;
    }

    private static PlatformApiException validation(String field, String message) {
        return new PlatformApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
            "Request validation failed", Map.of(field, message));
    }

    private static PlatformApiException conflict(String code, String message) {
        return new PlatformApiException(HttpStatus.CONFLICT, code, message);
    }
}
