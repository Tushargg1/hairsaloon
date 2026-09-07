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
 * Reads salon leads from the external scraper app. The response shape is
 * normalized in one place (parseLead) so the exact field names can be adjusted
 * without touching the distribution logic. Supports offset/limit pagination.
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

    /**
     * Fetches up to {@code limit} leads from the scraper API, identifying the
     * requesting referrer by name and phone (passed as query params + headers).
     */
    public List<Lead> fetch(int offset, int limit, String requesterName, String requesterPhone) {
        if (!properties.enabled()) return List.of();
        String base = properties.apiUrl().trim();
        String sep = base.contains("?") ? "&" : "?";
        String url = base + sep + "offset=" + offset + "&limit=" + limit
            + "&name=" + enc(requesterName) + "&phone=" + enc(requesterPhone);
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(20)).GET();
            if (properties.apiKey() != null && !properties.apiKey().isBlank()) {
                builder.header("Authorization", "Bearer " + properties.apiKey());
                builder.header("X-Api-Key", properties.apiKey());
            }
            if (requesterName != null) builder.header("X-Referrer-Name", requesterName);
            if (requesterPhone != null) builder.header("X-Referrer-Phone", requesterPhone);
            HttpResponse<String> response = client.send(builder.build(),
                HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("Scraper leads API returned {}", response.statusCode());
                return List.of();
            }
            return parse(mapper.readTree(response.body()));
        } catch (Exception e) {
            log.warn("Scraper leads fetch failed", e);
            return List.of();
        }
    }

    private List<Lead> parse(JsonNode root) {
        // Accept either a bare array or an object wrapping the array under a common key.
        JsonNode array = root.isArray() ? root
            : firstArray(root, "data", "leads", "results", "items", "records");
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

    /** Maps one scraped record to a normalized Lead. Adjust field names here only. */
    private static Lead parseLead(JsonNode n) {
        String id = firstText(n, "id", "_id", "placeId", "place_id", "leadId");
        String name = firstText(n, "name", "salonName", "salon_name", "title", "displayName");
        String phone = firstText(n, "phone", "phoneNumber", "phone_number", "contact", "mobile");
        String address = firstText(n, "address", "formattedAddress", "formatted_address", "location");
        String maps = firstText(n, "mapsUrl", "maps_url", "googleMapsUri", "mapUrl", "url", "link");
        if (id == null || id.isBlank()) {
            // No stable id from the source: fall back to name+phone so dedupe still works.
            id = (name == null ? "" : name) + "|" + (phone == null ? "" : phone);
            if (id.isBlank() || id.equals("|")) return null;
        }
        return new Lead(id.trim(), name, phone, address, maps);
    }

    private static String enc(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
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

    public record Lead(String externalId, String name, String phone, String address, String mapsUrl) {}
}
