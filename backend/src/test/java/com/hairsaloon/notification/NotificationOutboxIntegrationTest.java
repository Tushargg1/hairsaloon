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
    "spring.datasource.url=jdbc:h2:mem:phase7;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.data.redis.repositories.enabled=false",
    "app.notifications.scheduling-enabled=false", "app.notifications.batch-size=25",
    "app.notifications.max-attempts=3", "app.notifications.claim-duration=2m",
    "app.notifications.base-retry-delay=30s", "app.notifications.max-retry-delay=2m",
    "app.auth.jwt.secret=raw:0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-extra-secret",
    "app.auth.bootstrap-platform-admin.enabled=false"
})
class NotificationOutboxIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ReminderEnqueuer reminders;
    @Autowired NotificationOutboxWriter writer;
    @Autowired NotificationProcessor processor;
    @Autowired RecordingGateway gateway;

    @BeforeEach
    void clean() {
        gateway.reset();
        jdbc.update("DELETE FROM notification_outbox");
        jdbc.update("DELETE FROM bookings");
        jdbc.update("DELETE FROM salon_staff");
        jdbc.update("DELETE FROM services");
        jdbc.update("DELETE FROM salons");
        jdbc.update("DELETE FROM users");
    }

    @Test
    void repeatedReminderScansDeduplicateBothReminderTypesAndKeepTenantsSeparate() {
        Instant now = Instant.parse("2030-01-01T10:00:00Z");
        Fixture first = fixture("first", LocalDateTime.of(2030, 1, 1, 10, 30));
        Fixture second = fixture("second", LocalDateTime.of(2030, 1, 1, 10, 45));

        reminders.enqueueDueAt(now);
        reminders.enqueueDueAt(now);

        assertThat(count("notification_outbox")).isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification_outbox "
            + "WHERE notification_type='REMINDER_24H'", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification_outbox "
            + "WHERE notification_type='REMINDER_1H'", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification_outbox o "
            + "JOIN bookings b ON b.id=o.booking_id WHERE o.salon_id<>b.salon_id",
            Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification_outbox o "
            + "JOIN bookings b ON b.id=o.booking_id AND b.salon_id=o.salon_id "
            + "JOIN users u ON u.id=b.customer_id WHERE o.recipient_email<>u.email",
            Integer.class)).isZero();
        assertThat(first.salonId()).isNotEqualTo(second.salonId());
    }

    @Test
    void failuresRetryWithBackoffAndSentRowsNeverSendAgain() {
        Fixture fixture = fixture("retry", LocalDateTime.now().plusDays(2));
        writer.enqueue(fixture.salonId(), fixture.bookingId(),
            NotificationType.BOOKING_CONFIRMED, fixture.customerEmail(),
            "Booking confirmed", "Safe body", "v1");
        Instant due = Instant.now().plusSeconds(1);
        gateway.fail = true;

        assertThat(processor.processDueAt(due)).isOne();
        assertThat(gateway.attempts.get()).isOne();
        assertThat(jdbc.queryForObject("SELECT attempt_count FROM notification_outbox "
            + "WHERE salon_id=?", Integer.class, fixture.salonId())).isOne();
        assertThat(jdbc.queryForObject("SELECT sent_at FROM notification_outbox "
            + "WHERE salon_id=?", Instant.class, fixture.salonId())).isNull();

        gateway.fail = false;
        assertThat(processor.processDueAt(due.plusSeconds(31))).isOne();
        assertThat(gateway.attempts.get()).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT sent_at FROM notification_outbox "
            + "WHERE salon_id=?", Instant.class, fixture.salonId())).isNotNull();
        assertThat(processor.processDueAt(due.plusSeconds(300))).isZero();
        assertThat(gateway.attempts.get()).isEqualTo(2);
    }

    private Fixture fixture(String label, LocalDateTime start) {
        String owner = label + "-owner@example.com";
        String customer = label + "-customer@example.com";
        jdbc.update("INSERT INTO users(email,password_hash,role,created_at) "
            + "VALUES (?,'hash','SALON_OWNER',CURRENT_TIMESTAMP)", owner);
        jdbc.update("INSERT INTO users(email,password_hash,role,created_at) "
            + "VALUES (?,'hash','CUSTOMER',CURRENT_TIMESTAMP)", customer);
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
        jdbc.update("INSERT INTO bookings(salon_id,customer_id,staff_id,service_id,"
                + "start_datetime,end_datetime,status,price_snapshot,service_name_snapshot,created_at) "
                + "VALUES (?,?,?,?,?,?,'CONFIRMED',35,'Cut',CURRENT_TIMESTAMP)",
            salonId, customerId, staffId, serviceId, start, start.plusMinutes(30));
        long bookingId = id("bookings", "salon_id", salonId);
        return new Fixture(salonId, bookingId, customer);
    }

    private long id(String table, String column, Object value) {
        return jdbc.queryForObject("SELECT id FROM " + table + " WHERE " + column + "=?",
            Long.class, value);
    }

    private int count(String table) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
    }

    record Fixture(long salonId, long bookingId, String customerEmail) {}

    @TestConfiguration
    static class GatewayConfiguration {
        @Bean @Primary RecordingGateway recordingGateway() { return new RecordingGateway(); }
    }

    static class RecordingGateway implements EmailGateway {
        final AtomicInteger attempts = new AtomicInteger();
        volatile boolean fail;

        @Override
        public void send(EmailMessage message, String idempotencyKey) {
            attempts.incrementAndGet();
            if (fail) throw new IllegalStateException("simulated");
        }

        void reset() { attempts.set(0); fail = false; }
    }
}
