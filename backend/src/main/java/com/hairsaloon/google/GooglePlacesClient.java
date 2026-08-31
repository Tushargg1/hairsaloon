package com.hairsaloon.google;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

/**
 * Reads a salon's public data from the Google Places API (New). One "connect" or
 * "re-sync" performs at most two billed calls (Text Search + Place Details), so a
 * per-month counter keeps usage below the free-tier cap.
 */
@Component
public class GooglePlacesClient {

    private static final URI SEARCH = URI.create("https://places.googleapis.com/v1/places:searchText");
    private static final String DETAILS = "https://places.googleapis.com/v1/places/";
    private static final String DETAIL_FIELDS = "id,displayName,formattedAddress,"
        + "internationalPhoneNumber,nationalPhoneNumber,rating,userRatingCount,"
        + "googleMapsUri,reviews,photos";

    private final GooglePlacesProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10)).build();

    // Cheap month-scoped guard; resets when the month rolls over.
    private volatile YearMonth window = YearMonth.now();
    private final AtomicInteger callsThisMonth = new AtomicInteger();

    GooglePlacesClient(GooglePlacesProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
    }

    public boolean enabled() {
        return properties.enabled();
    }

    /** Fetches the place matching the pasted Google Maps URL or salon name/text query. */
    public GooglePlaceData fetch(String query) throws Exception {
        if (!properties.enabled()) {
            throw new IllegalStateException("Google Places is not configured");
        }
        // Short maps.app.goo.gl links carry no place data until they redirect, so expand
        // them first, then look for a place_id or fall back to the readable name/query.
        String resolved = expandShortLink(query);
        String placeId = extractPlaceId(resolved);
        if (placeId == null) {
            placeId = searchPlaceId(searchText(resolved));
        }
        return details(placeId);
    }

    /** Follows a shortened Google Maps link to its full URL; returns input unchanged otherwise. */
    private String expandShortLink(String query) {
        if (query == null || !query.matches("(?i)https?://(maps\\.app\\.goo\\.gl|goo\\.gl|g\\.co)/.*")) {
            return query;
        }
        try {
            HttpClient follower = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(10)).build();
            HttpRequest request = HttpRequest.newBuilder(URI.create(query.trim()))
                .timeout(Duration.ofSeconds(15)).GET().build();
            HttpResponse<Void> response = follower.send(request, HttpResponse.BodyHandlers.discarding());
            String finalUrl = response.uri() != null ? response.uri().toString() : query;
            return finalUrl == null || finalUrl.isBlank() ? query : finalUrl;
        } catch (Exception ignored) {
            return query;
        }
    }

    /** Turns an expanded Maps URL into a Text Search query using its readable place segment. */
    private static String searchText(String url) {
        if (url == null) return "";
        java.util.regex.Matcher place = java.util.regex.Pattern
            .compile("/maps/place/([^/@]+)").matcher(url);
        if (place.find()) {
            return URLDecoder.decode(place.group(1), StandardCharsets.UTF_8).replace('+', ' ');
        }
        java.util.regex.Matcher q = java.util.regex.Pattern
            .compile("[?&]q=([^&]+)").matcher(url);
        if (q.find()) {
            return URLDecoder.decode(q.group(1), StandardCharsets.UTF_8).replace('+', ' ');
        }
        return url;
    }

    private String searchPlaceId(String text) throws Exception {
        reserveCall();
        String body = mapper.writeValueAsString(java.util.Map.of("textQuery", text));
        HttpRequest request = HttpRequest.newBuilder(SEARCH)
            .timeout(Duration.ofSeconds(20))
            .header("Content-Type", "application/json")
            .header("X-Goog-Api-Key", properties.apiKey())
            .header("X-Goog-FieldMask", "places.id")
            .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        JsonNode root = send(request);
        JsonNode places = root.path("places");
        if (!places.isArray() || places.isEmpty()) {
            throw new IllegalArgumentException("No Google place found for that link or name");
        }
        return places.get(0).path("id").asText();
    }

    private GooglePlaceData details(String placeId) throws Exception {
        reserveCall();
        HttpRequest request = HttpRequest.newBuilder(
                URI.create(DETAILS + URLEncoder.encode(placeId, StandardCharsets.UTF_8)))
            .timeout(Duration.ofSeconds(20))
            .header("X-Goog-Api-Key", properties.apiKey())
            .header("X-Goog-FieldMask", DETAIL_FIELDS)
            .GET().build();
        JsonNode root = send(request);
        return parse(root);
    }

    private GooglePlaceData parse(JsonNode root) {
        String placeId = root.path("id").asText(null);
        String name = root.path("displayName").path("text").asText(null);
        String address = text(root, "formattedAddress");
        String phone = firstNonBlank(text(root, "internationalPhoneNumber"),
            text(root, "nationalPhoneNumber"));
        BigDecimal rating = root.has("rating")
            ? BigDecimal.valueOf(root.path("rating").asDouble()) : null;
        Integer count = root.has("userRatingCount")
            ? root.path("userRatingCount").asInt() : null;
        String mapsUri = text(root, "googleMapsUri");

        List<GoogleReviewData> reviews = new ArrayList<>();
        for (JsonNode review : root.path("reviews")) {
            int stars = review.path("rating").asInt(0);
            reviews.add(new GoogleReviewData(
                review.path("authorAttribution").path("displayName").asText(null),
                review.path("authorAttribution").path("photoUri").asText(null),
                stars,
                review.path("text").path("text").asText(null),
                review.path("relativePublishTimeDescription").asText(null),
                parseInstant(review.path("publishTime").asText(null))));
        }

        List<String> photos = new ArrayList<>();
        for (JsonNode photo : root.path("photos")) {
            String ref = photo.path("name").asText(null);
            if (ref != null && !ref.isBlank()) {
                // Media endpoint returns the image bytes; key is passed as a query param.
                photos.add("https://places.googleapis.com/v1/" + ref
                    + "/media?maxWidthPx=1200&key=" + properties.apiKey());
            }
        }
        return new GooglePlaceData(placeId, name, address, phone, rating, count, mapsUri,
            reviews, photos);
    }

    private JsonNode send(HttpRequest request) throws Exception {
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Google Places returned HTTP " + response.statusCode());
        }
        return mapper.readTree(response.body());
    }

    /** Increments the month counter and refuses once the configured cap is reached. */
    private void reserveCall() {
        YearMonth now = YearMonth.now();
        if (!now.equals(window)) {
            synchronized (this) {
                if (!now.equals(window)) {
                    window = now;
                    callsThisMonth.set(0);
                }
            }
        }
        if (callsThisMonth.incrementAndGet() > properties.monthlyCap()) {
            callsThisMonth.decrementAndGet();
            throw new IllegalStateException(
                "Monthly Google sync limit reached; please try again next month");
        }
    }

    /** Place IDs embedded in a Maps URL let us skip the billed Text Search call. */
    private static String extractPlaceId(String query) {
        if (query == null) return null;
        java.util.regex.Matcher matcher = java.util.regex.Pattern
            .compile("place_id[:=]([A-Za-z0-9_-]{10,})").matcher(query);
        return matcher.find() ? matcher.group(1) : null;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }

    private static String firstNonBlank(String a, String b) {
        return a != null && !a.isBlank() ? a : b;
    }

    private static Instant parseInstant(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    public record GooglePlaceData(String placeId, String name, String address, String phone,
                                  BigDecimal rating, Integer reviewCount, String mapsUri,
                                  List<GoogleReviewData> reviews, List<String> photoUrls) {}

    public record GoogleReviewData(String authorName, String authorPhotoUrl, int rating,
                                   String text, String relativeTime, Instant publishedAt) {}
}
