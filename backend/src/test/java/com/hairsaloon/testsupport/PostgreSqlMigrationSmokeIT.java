package com.hairsaloon.testsupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;

@EnabledIf("postgresAvailable")
class PostgreSqlMigrationSmokeIT {
    @BeforeAll
    static void migrateIsolatedSchema() {
        var database = PostgresIntegrationTestSupport.database(PostgreSqlMigrationSmokeIT.class);
        Flyway.configure()
            .dataSource(database.scopedUrl(), database.username(), database.password())
            .defaultSchema(database.schema())
            .schemas(database.schema())
            .createSchemas(true)
            .load()
            .migrate();
    }

    @AfterAll
    static void cleanupPostgres() {
        PostgresIntegrationTestSupport.cleanup(PostgreSqlMigrationSmokeIT.class);
    }

    static boolean postgresAvailable() {
        return PostgresIntegrationTestSupport.postgresAvailable();
    }

    @Test
    void flywayAppliesV1ThroughV12AndCreatesPushTables() throws Exception {
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            List<String> versions = new ArrayList<>();
            try (ResultSet rows = statement.executeQuery(
                    "SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank")) {
                while (rows.next()) versions.add(rows.getString(1));
            }
            assertThat(versions).containsExactly(
                "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14");
            assertThat(scalar(statement, "SELECT to_regclass('push_subscriptions')::text"))
                .isEqualTo("push_subscriptions");
            assertThat(scalar(statement, "SELECT to_regclass('push_outbox')::text"))
                .isEqualTo("push_outbox");
        }
        System.out.println("POSTGRES_MIGRATION_SMOKE_RAN=true source="
            + PostgresIntegrationTestSupport.source(PostgreSqlMigrationSmokeIT.class));
    }
    @Test
    void v8AuthAndV9TenantMediaConstraintsAreEnforced() throws Exception {
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            long firstOwner = insertUser(statement, "owner-one@example.test", "7000000001");
            long secondOwner = insertUser(statement, "owner-two@example.test", "7000000002");
            long firstSalon = insertSalon(statement, firstOwner, "media-one");
            long secondSalon = insertSalon(statement, secondOwner, "media-two");

            statement.executeUpdate(authChallenge("challenge-1", "SIGNUP", "proof-1", 0));
            assertThatThrownBy(() -> statement.executeUpdate(
                authChallenge("challenge-2", "INVALID", "proof-2", 0)))
                .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> statement.executeUpdate(
                authChallenge("challenge-3", "SIGNUP", "proof-3", -1)))
                .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> statement.executeUpdate(
                authChallenge("challenge-4", "PASSWORD_RESET", "proof-1", 0)))
                .isInstanceOf(SQLException.class);

            String upload = "11111111-1111-1111-1111-111111111111";
            statement.executeUpdate(mediaAsset(firstSalon, upload, "media/one"));
            statement.executeUpdate(mediaAsset(secondSalon, upload, "media/two"));
            assertThatThrownBy(() -> statement.executeUpdate(
                mediaAsset(firstSalon, upload, "media/duplicate")))
                .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> statement.executeUpdate(mediaAsset(
                9_999_999L, "22222222-2222-2222-2222-222222222222", "media/missing")))
                .isInstanceOf(SQLException.class);

            assertThatThrownBy(() -> statement.executeUpdate(
                "INSERT INTO push_subscriptions "
                    + "(salon_id,user_id,audience,endpoint,endpoint_hash,p256dh,auth) VALUES ("
                    + firstSalon + "," + firstOwner + ",'INVALID','https://push.invalid','"
                    + "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','key','auth')"))
                .isInstanceOf(SQLException.class);
        }
    }

    private static String authChallenge(String challenge, String purpose, String proof,
                                        int attempts) {
        return "INSERT INTO auth_challenges (challenge_hash,phone_hash,purpose,code_hash,"
            + "proof_hash,expires_at,last_sent_at,resend_available_at,attempts) VALUES ('"
            + challenge + "','phone-" + challenge + "','" + purpose + "','code-" + challenge
            + "','" + proof + "',CURRENT_TIMESTAMP + INTERVAL '10 minutes',CURRENT_TIMESTAMP,"
            + "CURRENT_TIMESTAMP," + attempts + ")";
    }

    private static String mediaAsset(long salonId, String upload, String objectKey) {
        return "INSERT INTO media_assets (salon_id,upload_id,media_type,object_key,public_url,"
            + "content_type,size_bytes) VALUES (" + salonId + ",'" + upload
            + "','GALLERY','" + objectKey + "','https://cdn.invalid/" + objectKey
            + "','image/jpeg',128)";
    }
    @Test
    void v11WalkInShapeAndExclusionAndV12PromotionSnapshotsAreEnforced() throws Exception {
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            long owner = insertUser(statement, "booking-owner@example.test", "7000000010");
            long customer = insertUser(statement, "booking-customer@example.test", "7000000011");
            long salon = insertSalon(statement, owner, "booking-smoke");
            long service = generatedId(statement, "INSERT INTO services "
                + "(salon_id,name,duration_minutes,price,is_active) VALUES (" + salon
                + ",'Smoke Cut',30,50.00,TRUE) RETURNING id");
            long staff = generatedId(statement, "INSERT INTO salon_staff (salon_id,name,is_active) "
                + "VALUES (" + salon + ",'Smoke Stylist',TRUE) RETURNING id");

            statement.executeUpdate(booking(salon, "NULL", staff, service,
                "2035-01-10 10:00:00", "2035-01-10 10:30:00",
                "'WALK_IN'", "'Walk In Guest'", "'+1 555 0100'", "40.00", "50.00", "10.00",
                "'SAVE10'"));
            assertThatThrownBy(() -> statement.executeUpdate(booking(salon,
                Long.toString(customer), staff, service,
                "2035-01-10 11:00:00", "2035-01-10 11:30:00",
                "'WALK_IN'", "'Invalid Guest'", "'+1 555 0101'", "50.00", "50.00", "0.00",
                "NULL"))).isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> statement.executeUpdate(booking(salon, "NULL", staff, service,
                "2035-01-10 10:15:00", "2035-01-10 10:45:00",
                "'WALK_IN'", "'Overlap Guest'", "'+1 555 0102'", "50.00", "50.00", "0.00",
                "NULL"))).isInstanceOf(SQLException.class);

            statement.executeUpdate("INSERT INTO promotions "
                + "(salon_id,code,code_normalized,discount_type,discount_value,starts_at,ends_at) "
                + "VALUES (" + salon + ",'SAVE10','SAVE10','FIXED',10.00,CURRENT_TIMESTAMP,"
                + "CURRENT_TIMESTAMP + INTERVAL '1 day')");
            assertThatThrownBy(() -> statement.executeUpdate("INSERT INTO promotions "
                + "(salon_id,code,code_normalized,discount_type,discount_value,starts_at,ends_at) "
                + "VALUES (" + salon + ",'TOOMUCH','TOOMUCH','PERCENT',101,CURRENT_TIMESTAMP,"
                + "CURRENT_TIMESTAMP + INTERVAL '1 day')"))
                .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> statement.executeUpdate(booking(salon,
                Long.toString(customer), staff, service,
                "2035-01-10 12:00:00", "2035-01-10 12:30:00",
                "'ONLINE'", "NULL", "NULL", "45.00", "50.00", "10.00", "'SAVE10'")))
                .isInstanceOf(SQLException.class);

            try (ResultSet snapshot = statement.executeQuery(
                    "SELECT original_price,discount_amount,price_snapshot,promo_code FROM bookings "
                        + "WHERE salon_id=" + salon + " AND start_datetime='2035-01-10 10:00:00'")) {
                assertThat(snapshot.next()).isTrue();
                assertThat(snapshot.getBigDecimal(1)).isEqualByComparingTo(new BigDecimal("50.00"));
                assertThat(snapshot.getBigDecimal(2)).isEqualByComparingTo(new BigDecimal("10.00"));
                assertThat(snapshot.getBigDecimal(3)).isEqualByComparingTo(new BigDecimal("40.00"));
                assertThat(snapshot.getString(4)).isEqualTo("SAVE10");
            }
        }
    }
    private static String booking(long salon, String customer, long staff, long service,
                                  String start, String end, String source, String guestName,
                                  String guestPhone, String price, String original, String discount,
                                  String promoCode) {
        return "INSERT INTO bookings (salon_id,customer_id,staff_id,service_id,start_datetime,"
            + "end_datetime,status,price_snapshot,service_name_snapshot,booking_source,guest_name,"
            + "guest_phone,original_price,discount_amount,promo_code) VALUES ("
            + salon + "," + customer + "," + staff + "," + service + ",'" + start + "','" + end
            + "','CONFIRMED'," + price + ",'Smoke Cut'," + source + "," + guestName + ","
            + guestPhone + "," + original + "," + discount + "," + promoCode + ")";
    }

    private static long insertUser(Statement statement, String email, String phone)
            throws SQLException {
        return generatedId(statement, "INSERT INTO users (email,password_hash,role,phone) VALUES ('"
            + email + "','test-only-hash','SALON_OWNER','" + phone + "') RETURNING id");
    }

    private static long insertSalon(Statement statement, long owner, String subdomain)
            throws SQLException {
        return generatedId(statement, "INSERT INTO salons "
            + "(owner_id,subdomain,name,address,city,status) VALUES (" + owner + ",'" + subdomain
            + "','Smoke Salon','1 Test Street','Test City','ACTIVE') RETURNING id");
    }

    private static long generatedId(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private static String scalar(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private static Connection connection() throws SQLException {
        return PostgresIntegrationTestSupport.connection(PostgreSqlMigrationSmokeIT.class);
    }
}
