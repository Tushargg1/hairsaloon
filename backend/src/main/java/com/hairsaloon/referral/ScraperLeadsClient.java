package com.hairsaloon.referral;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Client for the external "India Beauty Biz Scraper" API.
 *  - A referrer must be registered there (POST /api/users/register) and approved
 *    by the scraper admin before they can pull leads.
 *  - Leads are delivered via GET /api/data/batch with header X-User-Code — it
 *    returns up to 10 fresh (never-sent) businesses and atomically marks them sent.
 * The business record shape is normalized in parseLead so field-name tweaks stay
 * in one place.
 */
@Component
public class ScraperLeadsClient {

    private static final Logger log = LoggerFactory.getLogger(ScraperLeadsClient.class);

    private final ReferralLeadsProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10)).build();

    public ScraperLeadsClient(ReferralLeadsProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
    }

    public boolean enabled() {
        return properties.enabled();
    }

    private String base() {
        String url = properties.apiUrl().trim();
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    /** Registers a referrer with the scraper app (saved PENDING until admin approves). */
    public void register(String username, String phone, String userCode) {
        if (!properties.enabled()) return;
        String body = "{\"username\":\"" + esc(username) + "\",\"phone_number\":\"" + esc(phone)
            + "\",\"user_code\":\"" + esc(userCode) + "\"}";
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(base() + "/api/users/register"))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            // 200 = registered; a duplicate code is fine (already registered).
            if (response.statusCode() / 100 != 2 && response.statusCode() != 409) {
                log.warn("Scraper register returned {} for {}", response.statusCode(), userCode);
            }
        } catch (Exception e) {
            log.warn("Scraper register failed for {}", userCode, e);
        }
    }

    /** Returns PENDING / APPROVED / REJECTED / UNKNOWN for a user code. */
    public String status(String userCode) {
        if (!properties.enabled()) return "UNKNOWN";
        try {
            HttpRequest request = HttpRequest.newBuilder(
                    URI.create(base() + "/api/users/status/" + enc(userCode)))
                .timeout(Duration.ofSeconds(20)).GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) return "UNKNOWN";
            JsonNode root = mapper.readTree(response.body());
            String status = firstText(root, "status", "state");
            return status == null ? "UNKNOWN" : status.toUpperCase();
        } catch (Exception e) {
            log.warn("Scraper status check failed for {}", userCode, e);
            return "UNKNOWN";
        }
    }

    /**
     * Fetches the next batch (up to 10) of fresh businesses for this referrer.
     * The scraper marks them sent, so this is called exactly once per batch.
     */
    public List<Lead> fetchBatch(String userCode) {
        if (!properties.enabled()) return List.of();
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(base() + "/api/data/batch"))
                .timeout(Duration.ofSeconds(30))
                .header("X-User-Code", userCode)
                .GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401 || response.statusCode() == 403) {
                throw new NotApprovedException();
            }
            if (response.statusCode() / 100 != 2) {
                log.warn("Scraper batch returned {}", response.statusCode());
                return List.of();
            }
            return parse(mapper.readTree(response.body()));
        } catch (NotApprovedException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Scraper batch fetch failed", e);
            return List.of();
        }
    }

    private List<Lead> parse(JsonNode root) {
        JsonNode array = root.isArray() ? root
            : firstArray(root, "data", "businesses", "leads", "results", "items", "records");
        List<Lead> leads = new ArrayList<>();
        if (array != null && array.isArray()) {
            for (JsonNode node : array) {
                Lead lead = parseLead(node);
                if (lead != null) leads.add(lead);
            }
        }
        return leads;
    }

    private static JsonNode firstArray(JsonNode root, String... keys) {
        for (String key : keys) {
            JsonNode node = root.path(key);
            if (node.isArray()) return node;
        }
        return null;
    }

    /** Maps one scraped business to a normalized Lead. Adjust field names here only. */
    private static Lead parseLead(JsonNode n) {
        String id = firstText(n, "id", "business_id", "_id", "place_id", "placeId");
        String name = firstText(n, "name", "business_name", "salon_name", "title");
        String phone = firstText(n, "phone", "phone_number", "phoneNumber", "contact", "mobile");
        String address = firstText(n, "address", "full_address", "formatted_address", "location");
        String maps = firstText(n, "google_maps_url", "maps_url", "map_url", "google_url", "url", "link", "website");
        if (id == null || id.isBlank()) {
            id = (name == null ? "" : name) + "|" + (phone == null ? "" : phone);
            if (id.isBlank() || id.equals("|")) return null;
        }
        return new Lead(id.trim(), name, phone, address, maps);
    }

    private static String enc(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static String esc(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode value = node.path(field);
            if (value != null && !value.isMissingNode() && !value.isNull()) {
                String text = value.asText(null);
                if (text != null && !text.isBlank()) return text;
            }
        }
        return null;
    }

    /** Thrown when the scraper says this user code is not APPROVED (401/403). */
    public static class NotApprovedException extends RuntimeException {}

    public record Lead(String externalId, String name, String phone, String address, String mapsUrl) {}
}
