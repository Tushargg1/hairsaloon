package com.hairsaloon;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class SchemaMigrationTest {

    private static final String MIGRATION = "/db/migration/V1__create_mvp_schema.sql";

    @Test
    void tenantOwnedTablesContainSalonIdAndBookingOverlapIsDatabaseEnforced() throws IOException {
        String sql;
        try (var stream = getClass().getResourceAsStream(MIGRATION)) {
            assertThat(stream).isNotNull();
            sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }

        List.of("salon_photos", "salon_staff", "staff_working_hours", "staff_time_off",
                "services", "staff_services", "bookings", "reviews")
            .forEach(table -> assertThat(tableBody(sql, table)).contains("salon_id"));

        assertThat(sql)
            .contains("CREATE EXTENSION IF NOT EXISTS btree_gist")
            .contains("CONSTRAINT no_overlapping_bookings EXCLUDE USING gist")
            .contains("staff_id WITH =")
            .contains("tsrange(start_datetime, end_datetime) WITH &&")
            .contains(") WHERE (status = 'CONFIRMED')");
    }

    @Test
    void notificationOutboxIsTenantScopedAndDeduplicated() throws IOException {
        String sql;
        try (var stream = getClass().getResourceAsStream(
                "/db/migration/V3__create_notification_outbox.sql")) {
            assertThat(stream).isNotNull();
            sql = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
        assertThat(tableBody(sql, "notification_outbox"))
            .contains("salon_id BIGINT NOT NULL")
            .contains("attempt_count INTEGER NOT NULL")
            .contains("next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL")
            .contains("sent_at TIMESTAMP WITH TIME ZONE")
            .contains("UNIQUE (salon_id, event_key)");
    }

    private static String tableBody(String sql, String table) {
        var matcher = Pattern.compile("CREATE TABLE " + table + " \\((.*?)\\n\\);", Pattern.DOTALL)
            .matcher(sql);
        assertThat(matcher.find()).as("table %s exists", table).isTrue();
        return matcher.group(1);
    }
}
