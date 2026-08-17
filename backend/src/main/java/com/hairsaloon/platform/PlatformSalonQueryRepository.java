package com.hairsaloon.platform;

import com.hairsaloon.platform.SalonDtos.PendingSalonResponse;
import com.hairsaloon.platform.SalonDtos.SalonResponse;
import com.hairsaloon.tenant.SalonStatus;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class PlatformSalonQueryRepository {

    private static final String DIRECTORY_START = """
        WITH directory AS (
            SELECT s.id, s.subdomain, s.name, s.description, s.address, s.city,
                   s.phone, s.email, s.logo_url, s.timezone, s.status, s.created_at,
                   CAST(COALESCE(AVG(CAST(r.rating AS DECIMAL(4,2))), 0) AS DECIMAL(4,2)) AS rating,
                   COUNT(r.id) AS review_count,
                   COUNT(*) OVER() AS total_elements
              FROM salons s
              LEFT JOIN reviews r ON r.salon_id = s.id
             WHERE s.status = 'ACTIVE'
        """;

    private static final String DIRECTORY_END = """
             GROUP BY s.id, s.subdomain, s.name, s.description, s.address, s.city,
                      s.phone, s.email, s.logo_url, s.timezone, s.status, s.created_at
        %s
        )
        SELECT * FROM directory
         ORDER BY LOWER(name), id
         LIMIT :limit OFFSET :offset
        """;

    private final NamedParameterJdbcTemplate jdbc;

    PlatformSalonQueryRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    DirectoryResult findDirectory(String city, String service, BigDecimal rating,
                                  String search, int page, int size) {
        StringBuilder filters = new StringBuilder();
        Map<String, Object> parameters = new HashMap<>();
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
        String having = "";
        if (rating.signum() > 0) {
            having = "HAVING COALESCE(AVG(r.rating), 0) >= :rating";
            parameters.put("rating", rating);
        }
        parameters.put("limit", size);
        parameters.put("offset", (long) page * size);
        String sql = DIRECTORY_START + filters + DIRECTORY_END.formatted(having);
        List<DirectoryRow> rows = jdbc.query(sql, parameters, (rs, rowNumber) -> {
            long total = rs.getLong("total_elements");
            Long id = rs.getObject("id", Long.class);
            if (id == null) {
                return new DirectoryRow(null, total);
            }
            SalonResponse salon = new SalonResponse(id, rs.getString("subdomain"),
                rs.getString("name"), rs.getString("description"), rs.getString("address"),
                rs.getString("city"), rs.getString("phone"), rs.getString("email"),
                rs.getString("logo_url"), rs.getString("timezone"),
                SalonStatus.valueOf(rs.getString("status")), rs.getBigDecimal("rating"),
                rs.getLong("review_count"), instant(rs.getTimestamp("created_at")));
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

    private record DirectoryRow(SalonResponse salon, long total) {
    }
}
