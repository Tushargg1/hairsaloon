package com.hairsaloon.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:push;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.data.redis.repositories.enabled=false",
    "app.notifications.scheduling-enabled=false", "app.push.enabled=false",
    "app.push.batch-size=25", "app.push.max-attempts=3",
    "app.push.claim-duration=2m", "app.push.base-retry-delay=30s",
    "app.push.max-retry-delay=2m",
    "app.auth.jwt.secret=raw:0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-extra-secret",
    "app.auth.bootstrap-platform-admin.enabled=false"
})
class PushOutboxIntegrationTest {
    private static final String P256DH = "A".repeat(87);
    private static final String AUTH = "B".repeat(22);

    @Autowired JdbcTemplate jdbc;
    @Autowired PushSubscriptionService subscriptions;
    @Autowired PushOutboxWriter writer;
    @Autowired PushProcessor processor;
    @Autowired RecordingPushGateway gateway;

    @BeforeEach
    void clean() {
        gateway.reset();
        jdbc.update("DELETE FROM push_outbox");
        jdbc.update("DELETE FROM push_subscriptions");
        jdbc.update("DELETE FROM bookings");
        jdbc.update("DELETE FROM salon_staff");
        jdbc.update("DELETE FROM services");
        jdbc.update("DELETE FROM salons");
        jdbc.update("DELETE FROM users");
    }

    @Test
    void subscriptionsAreTenantUserScopedAndEventsOnlyExistForSubscribers() {
        Fixture first = fixture("first");
        Fixture second = fixture("second");
        assertThat(enqueueCustomer(first)).isZero();

        subscriptions.subscribe(first.salonId(), first.customerId(),
            PushSubscriptionAudience.CUSTOMER, endpoint("first"), P256DH, AUTH);
        subscriptions.subscribe(first.salonId(), first.customerId(),
            PushSubscriptionAudience.CUSTOMER, endpoint("first"), "C".repeat(87), AUTH);
        subscriptions.subscribe(first.salonId(), first.ownerId(),
            PushSubscriptionAudience.OWNER, endpoint("owner"), P256DH, AUTH);
        subscriptions.subscribe(second.salonId(), second.customerId(),
            PushSubscriptionAudience.CUSTOMER, endpoint("second"), P256DH, AUTH);

        assertThat(count("push_subscriptions")).isEqualTo(3);
        assertThat(enqueueCustomer(first)).isOne();
        assertThat(writer.enqueueForUser(first.salonId(), first.bookingId(), first.ownerId(),
            PushSubscriptionAudience.OWNER, NotificationType.BOOKING_CONFIRMED,
            "Confirmed", "Appointment update", "/dashboard/bookings", "v1")).isOne();
        assertThat(enqueueCustomer(first)).isZero();
        assertThat(count("push_outbox")).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM push_outbox WHERE salon_id=?",
            Integer.class, second.salonId())).isZero();

        assertThat(subscriptions.unsubscribe(first.salonId(), first.customerId(),
            PushSubscriptionAudience.CUSTOMER, endpoint("first"))).isTrue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM push_outbox "
            + "WHERE discarded_at IS NOT NULL", Integer.class)).isOne();
    }

    @Test
    void retryableDeliveryBacksOffThenSucceeds() {
        Fixture fixture = subscribedFixture("retry");
        enqueueCustomer(fixture);
        Instant due = Instant.now().plusSeconds(1);
        gateway.result = PushGatewayResult.retry(503);

        assertThat(processor.processDueAt(due)).isOne();
        assertThat(gateway.attempts.get()).isOne();
        assertThat(jdbc.queryForObject("SELECT attempt_count FROM push_outbox",
            Integer.class)).isOne();
        assertThat(jdbc.queryForObject("SELECT last_error FROM push_outbox", String.class))
            .isEqualTo("RETRY_HTTP_503");

        gateway.result = PushGatewayResult.success();
        assertThat(processor.processDueAt(due.plusSeconds(31))).isOne();
        assertThat(gateway.attempts.get()).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT sent_at FROM push_outbox", Instant.class))
            .isNotNull();
        assertThat(processor.processDueAt(due.plusSeconds(300))).isZero();
    }

    @Test
    void goneResultRemovesSubscriptionAndPermanentlyDiscardsDelivery() {
        Fixture fixture = subscribedFixture("gone");
        enqueueCustomer(fixture);
        gateway.result = PushGatewayResult.permanent(410);

        assertThat(processor.processDueAt(Instant.now().plusSeconds(1))).isOne();
        assertThat(count("push_subscriptions")).isZero();
        assertThat(jdbc.queryForObject("SELECT discarded_at FROM push_outbox", Instant.class))
            .isNotNull();
        assertThat(jdbc.queryForObject("SELECT last_error FROM push_outbox", String.class))
            .isEqualTo("PERMANENT_FAILURE_HTTP_410");
    }

    private int enqueueCustomer(Fixture fixture) {
        return writer.enqueueForUser(fixture.salonId(), fixture.bookingId(), fixture.customerId(),
            PushSubscriptionAudience.CUSTOMER, NotificationType.BOOKING_CONFIRMED,
            "Confirmed", "Appointment update", "/bookings", "v1");
    }

    private Fixture subscribedFixture(String label) {
        Fixture fixture = fixture(label);
        subscriptions.subscribe(fixture.salonId(), fixture.customerId(),
            PushSubscriptionAudience.CUSTOMER, endpoint(label), P256DH, AUTH);
        return fixture;
    }

    private Fixture fixture(String label) {
        String owner = label + "-owner@example.com";
        String customer = label + "-customer@example.com";
        jdbc.update("INSERT INTO users(email,phone,password_hash,role,created_at) "
            + "VALUES (?,?,'hash','SALON_OWNER',CURRENT_TIMESTAMP)", owner, label + "-owner");
        jdbc.update("INSERT INTO users(email,phone,password_hash,role,created_at) "
            + "VALUES (?,?,'hash','CUSTOMER',CURRENT_TIMESTAMP)", customer, label + "-customer");
        long ownerId = id("users", "email", owner);
        long customerId = id("users", "email", customer);
        jdbc.update("INSERT INTO salons(owner_id,subdomain,name,address,city,email,timezone,"
                + "status,cancellation_window_minutes,created_at) "
                + "VALUES (?,?,?,?,?,?,'UTC','ACTIVE',120,CURRENT_TIMESTAMP)",
            ownerId, label + "salon", label + " Salon", "1 Main", "City", owner);
        long salonId = id("salons", "owner_id", ownerId);
        jdbc.update("INSERT INTO services(salon_id,name,duration_minutes,price,is_active,created_at) "
            + "VALUES (?,'Cut',30,35,TRUE,CURRENT_TIMESTAMP)", salonId);
        long serviceId = id("services", "salon_id", salonId);
        jdbc.update("INSERT INTO salon_staff(salon_id,name,is_active,created_at) "
            + "VALUES (?,'Taylor',TRUE,CURRENT_TIMESTAMP)", salonId);
        long staffId = id("salon_staff", "salon_id", salonId);
        LocalDateTime start = LocalDateTime.now().plusDays(2);
        jdbc.update("INSERT INTO bookings(salon_id,customer_id,staff_id,service_id,"
                + "start_datetime,end_datetime,status,price_snapshot,service_name_snapshot,created_at) "
                + "VALUES (?,?,?,?,?,?,'CONFIRMED',35,'Cut',CURRENT_TIMESTAMP)",
            salonId, customerId, staffId, serviceId, start, start.plusMinutes(30));
        return new Fixture(salonId, id("bookings", "salon_id", salonId), ownerId, customerId);
    }

    private long id(String table, String column, Object value) {
        return jdbc.queryForObject("SELECT id FROM " + table + " WHERE " + column + "=?",
            Long.class, value);
    }

    private int count(String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
    }

    private static String endpoint(String label) {
        return "https://push.example/" + label;
    }

    record Fixture(long salonId, long bookingId, long ownerId, long customerId) {}

    @TestConfiguration
    static class GatewayConfiguration {
        @Bean @Primary
        RecordingPushGateway recordingPushGateway() { return new RecordingPushGateway(); }
    }

    static class RecordingPushGateway implements PushGateway {
        final AtomicInteger attempts = new AtomicInteger();
        volatile PushGatewayResult result = PushGatewayResult.success();

        @Override
        public PushGatewayResult send(PushMessage message) {
            attempts.incrementAndGet();
            return result;
        }

        void reset() {
            attempts.set(0);
            result = PushGatewayResult.success();
        }
    }
}
