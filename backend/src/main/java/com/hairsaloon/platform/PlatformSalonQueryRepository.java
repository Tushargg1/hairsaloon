package com.hairsaloon.platform;

import com.hairsaloon.platform.SalonDtos.PendingSalonResponse;
import com.hairsaloon.platform.SalonDtos.SalonResponse;
import com.hairsaloon.tenant.SalonStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class PlatformSalonQueryRepository {

    /**
     * Great-circle distance in kilometres. The inner value is clamped to [-1, 1] because
     * floating-point rounding can otherwise push it marginally outside ACOS's domain.
     */
    private static final String HAVERSINE_KM = """
        6371 * ACOS(LEAST(1, GREATEST(-1,
            COS(RADIANS(:originLat)) * COS(RADIANS(CAST(s.latitude AS DOUBLE PRECISION)))
                * COS(RADIANS(CAST(s.longitude AS DOUBLE PRECISION)) - RADIANS(:originLng))
            + SIN(RADIANS(:originLat)) * SIN(RADIANS(CAST(s.latitude AS DOUBLE PRECISION)))
        )))
        """;

    private static final String DIRECTORY_START = """
        WITH directory AS (
            SELECT s.id, s.subdomain, s.name, s.description, s.address, s.city,
                   s.phone, s.email, s.logo_url, s.timezone, s.status, s.created_at,
                   s.latitude, s.longitude,
                   CAST(COALESCE(AVG(CAST(r.rating AS DECIMAL(4,2))), 0) AS DECIMAL(4,2)) AS rating,
                   COUNT(r.id) AS review_count,
                   %s AS distance_km,
                   COUNT(*) OVER() AS total_elements
              FROM salons s
              LEFT JOIN reviews r ON r.salon_id = s.id
             WHERE s.status = 'ACTIVE'
        """;

    private static final String DIRECTORY_END = """
             GROUP BY s.id, s.subdomain, s.name, s.description, s.address, s.city,
                      s.phone, s.email, s.logo_url, s.timezone, s.status, s.created_at,
                      s.latitude, s.longitude
        %s
        )
        SELECT * FROM directory
         ORDER BY %s
         LIMIT :limit OFFSET :offset
        """;

    private static final String DISTANCE_ABSENT = "CAST(NULL AS DECIMAL(10,3))";
    private static final String ORDER_BY_NAME = "LOWER(name), id";
    /** NULLS LAST keeps salons without coordinates from crowding out nearby matches. */
    private static final String ORDER_BY_DISTANCE =
        "distance_km IS NULL, distance_km, LOWER(name), id";

    private final NamedParameterJdbcTemplate jdbc;

    PlatformSalonQueryRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    DirectoryResult findDirectory(String city, String service, BigDecimal rating,
                                  String search, int page, int size, GeoFilter geo) {
        StringBuilder filters = new StringBuilder();
        Map<String, Object> parameters = new HashMap<>();
        boolean nearby = geo != null && geo.isPresent();
        if (nearby) {
            parameters.put("originLat", geo.latitude().doubleValue());
            parameters.put("originLng", geo.longitude().doubleValue());
            // Bounding box prefilter: cheap index-friendly narrowing before haversine.
            double latDelta = geo.radiusKm() / 111.045d;
            double lngDelta = geo.radiusKm() / (111.045d
                * Math.max(0.01d, Math.cos(Math.toRadians(geo.latitude().doubleValue()))));
            filters.append("""
                 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
                 AND s.latitude BETWEEN :minLat AND :maxLat
                 AND s.longitude BETWEEN :minLng AND :maxLng
                """);
            parameters.put("minLat", geo.latitude().doubleValue() - latDelta);
            parameters.put("maxLat", geo.latitude().doubleValue() + latDelta);
            parameters.put("minLng", geo.longitude().doubleValue() - lngDelta);
            parameters.put("maxLng", geo.longitude().doubleValue() + lngDelta);
            parameters.put("radiusKm", geo.radiusKm());
        }
        if (!city.isEmpty()) {
            filters.append(" AND LOWER(s.city) = :city\n");
            parameters.put("city", city);
        }
        if (!search.isEmpty()) {
            filters.append("""
                 AND (POSITION(:search IN LOWER(s.name)) > 0
                      OR POSITION(:search IN LOWER(COALESCE(s.description, ''))) > 0
                      OR POSITION(:search IN LOWER(s.address)) > 0
                      OR POSITION(:search IN LOWER(s.city)) > 0)
                """);
            parameters.put("search", search);
        }
        if (!service.isEmpty()) {
            filters.append("""
                 AND EXISTS (SELECT 1 FROM services sv
                              WHERE sv.salon_id = s.id AND sv.is_active = TRUE
                                AND POSITION(:service IN LOWER(sv.name)) > 0)
                """);
            parameters.put("service", service);
        }
        StringBuilder having = new StringBuilder();
        if (rating.signum() > 0) {
            having.append("HAVING COALESCE(AVG(r.rating), 0) >= :rating");
            parameters.put("rating", rating);
        }
        if (nearby) {
            // The radius must be applied after grouping because the distance expression
            // references grouped columns.
            having.append(having.isEmpty() ? "HAVING " : " AND ")
                .append(HAVERSINE_KM).append(" <= :radiusKm");
        }
        parameters.put("limit", size);
        parameters.put("offset", (long) page * size);
        String sql = DIRECTORY_START.formatted(nearby ? HAVERSINE_KM : DISTANCE_ABSENT)
            + filters
            + DIRECTORY_END.formatted(having.toString(),
                nearby ? ORDER_BY_DISTANCE : ORDER_BY_NAME);
        List<DirectoryRow> rows = jdbc.query(sql, parameters, (rs, rowNumber) -> {
            long total = rs.getLong("total_elements");
            Long id = rs.getObject("id", Long.class);
            if (id == null) {
                return new DirectoryRow(null, total);
            }
            BigDecimal distance = rs.getBigDecimal("distance_km");
            SalonResponse salon = new SalonResponse(id, rs.getString("subdomain"),
                rs.getString("name"), rs.getString("description"), rs.getString("address"),
                rs.getString("city"), rs.getString("phone"), rs.getString("email"),
                rs.getString("logo_url"), rs.getString("timezone"),
                SalonStatus.valueOf(rs.getString("status")), rs.getBigDecimal("rating"),
                rs.getLong("review_count"), rs.getBigDecimal("latitude"),
                rs.getBigDecimal("longitude"),
                distance == null ? null : distance.setScale(2, RoundingMode.HALF_UP),
                instant(rs.getTimestamp("created_at")));
            return new DirectoryRow(salon, total);
        });
        long total;
        if (!rows.isEmpty()) {
            total = rows.get(0).total();
        } else if (page > 0) {
            parameters.put("limit", 1);
            parameters.put("offset", 0L);
            List<Long> totals = jdbc.query(sql, parameters,
                (rs, rowNumber) -> rs.getLong("total_elements"));
            total = totals.isEmpty() ? 0 : totals.get(0);
        } else {
            total = 0;
        }
        List<SalonResponse> salons = new ArrayList<>();
        rows.stream().map(DirectoryRow::salon).filter(java.util.Objects::nonNull)
            .forEach(salons::add);
        return new DirectoryResult(salons, total);
    }
    List<PendingSalonResponse> findPending() {
        return jdbc.query("""
            SELECT s.id, s.subdomain, s.name, s.description, s.address, s.city,
                   s.phone, s.email, s.logo_url, s.timezone, u.email AS owner_email,
                   s.status, s.created_at
              FROM salons s
              JOIN users u ON u.id = s.owner_id
             WHERE s.status = 'PENDING'
             ORDER BY s.created_at, s.id
            """, (rs, rowNumber) -> new PendingSalonResponse(
                rs.getLong("id"), rs.getString("subdomain"), rs.getString("name"),
                rs.getString("description"), rs.getString("address"), rs.getString("city"),
                rs.getString("phone"), rs.getString("email"), rs.getString("logo_url"),
                rs.getString("timezone"), rs.getString("owner_email"),
                SalonStatus.valueOf(rs.getString("status")),
                instant(rs.getTimestamp("created_at"))));
    }

    private static java.time.Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    record DirectoryResult(List<SalonResponse> salons, long total) {
    }

    /** Optional proximity constraint; absent unless both coordinates are supplied. */
    record GeoFilter(BigDecimal latitude, BigDecimal longitude, double radiusKm) {
        static final GeoFilter NONE = new GeoFilter(null, null, 0);

        boolean isPresent() {
            return latitude != null && longitude != null && radiusKm > 0;
        }
    }

    private record DirectoryRow(SalonResponse salon, long total) {
    }
}
