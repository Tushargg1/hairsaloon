package com.hairsaloon.tenantdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hairsaloon.testsupport.PostgresIntegrationTestSupport;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@ActiveProfiles("integration")
@AutoConfigureMockMvc
@EnabledIf("postgresAvailable")
class BookingConcurrencyIT {
    static boolean postgresAvailable() {
        return PostgresIntegrationTestSupport.postgresAvailable();
    }

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry properties) {
        PostgresIntegrationTestSupport.configure(BookingConcurrencyIT.class, properties);
    }

    @AfterAll
    static void cleanupPostgres() {
        PostgresIntegrationTestSupport.cleanup(BookingConcurrencyIT.class);
    }

    @Autowired MockMvc mockMvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired com.hairsaloon.auth.TestUserFactory testUsers;
    @Test
    void exactlyOneOfTwentySimultaneousHttpCreatesWinsTheDatabaseSlot() throws Exception {
        String suffix = Long.toString(System.nanoTime(), 36);
        String subdomain = "race" + suffix;
        String ownerEmail = subdomain + "-owner@example.com";
        String customerEmail = subdomain + "-customer@example.com";
        String ownerToken = signup(ownerEmail, "SALON_OWNER");
        String customerToken = signup(customerEmail, "CUSTOMER");
        assertThat(ownerToken).isNotBlank();
        long ownerId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class,
            ownerEmail);
        jdbc.update("INSERT INTO salons "
                + "(owner_id,subdomain,name,address,city,timezone,status,cancellation_window_minutes) "
                + "VALUES (?,?,'Race Salon','1 Main','City','UTC','ACTIVE',120)",
            ownerId, subdomain);
        long salonId = jdbc.queryForObject("SELECT id FROM salons WHERE owner_id=?",
            Long.class, ownerId);
        jdbc.update("INSERT INTO services "
            + "(salon_id,name,duration_minutes,price,category,is_active) "
            + "VALUES (?,'Race Cut',30,40.00,'Hair',TRUE)", salonId);
        long serviceId = jdbc.queryForObject("SELECT id FROM services WHERE salon_id=?",
            Long.class, salonId);
        jdbc.update("INSERT INTO salon_staff (salon_id,name,is_active) "
            + "VALUES (?,'Concurrent Stylist',TRUE)", salonId);
        long staffId = jdbc.queryForObject("SELECT id FROM salon_staff WHERE salon_id=?",
            Long.class, salonId);
        jdbc.update("INSERT INTO staff_services (salon_id,staff_id,service_id) VALUES (?,?,?)",
            salonId, staffId, serviceId);
        LocalDate date = LocalDate.now().plusDays(14);
        int day = date.getDayOfWeek().getValue() % 7;
        jdbc.update("INSERT INTO staff_working_hours "
                + "(salon_id,staff_id,day_of_week,start_time,end_time) VALUES (?,?,?,?,?)",
            salonId, staffId, day, java.sql.Time.valueOf("09:00:00"),
            java.sql.Time.valueOf("17:00:00"));
        String request = "{\"staffId\":" + staffId + ",\"serviceId\":" + serviceId
            + ",\"startDatetime\":\"" + date + "T10:00:00\"}";

        List<HttpResult> results = runSimultaneously(20, subdomain + ".localhost",
            customerToken, request);
        assertThat(results.stream().filter(result -> result.status() == 201)).hasSize(1);
        List<HttpResult> conflicts = results.stream()
            .filter(result -> result.status() == 409).toList();
        assertThat(conflicts).hasSize(19);
        for (HttpResult conflict : conflicts) {
            var body = json.readTree(conflict.body());
            assertThat(body.get("error").asText()).isEqualTo("SLOT_UNAVAILABLE");
            assertThat(body.get("message").asText()).isEqualTo(BookingService.SLOT_MESSAGE);
            assertThat(body.get("fieldErrors").size()).isZero();
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM bookings WHERE salon_id=?",
            Integer.class, salonId)).isOne();
        System.out.println("BOOKING_CONCURRENCY_POSTGRES_RAN=true source="
            + PostgresIntegrationTestSupport.source(BookingConcurrencyIT.class));
    }

    @Test
    void promotionTotalLimitIsReservedAtomicallyAcrossDifferentSlots() throws Exception {
        String suffix = Long.toString(System.nanoTime(), 36);
        String subdomain = "promorace" + suffix;
        String ownerEmail = subdomain + "-owner@example.com";
        String firstEmail = subdomain + "-first@example.com";
        String secondEmail = subdomain + "-second@example.com";
        signup(ownerEmail, "SALON_OWNER");
        String firstToken = signup(firstEmail, "CUSTOMER");
        String secondToken = signup(secondEmail, "CUSTOMER");
        long ownerId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class,
            ownerEmail);
        jdbc.update("INSERT INTO salons "
                + "(owner_id,subdomain,name,address,city,timezone,status,cancellation_window_minutes) "
                + "VALUES (?,?,'Promo Race Salon','1 Main','City','UTC','ACTIVE',120)",
            ownerId, subdomain);
        long salonId = jdbc.queryForObject("SELECT id FROM salons WHERE owner_id=?",
            Long.class, ownerId);
        jdbc.update("INSERT INTO services "
                + "(salon_id,name,duration_minutes,price,category,is_active) "
                + "VALUES (?,'Promo Cut',30,40.00,'Hair',TRUE)", salonId);
        long serviceId = jdbc.queryForObject("SELECT id FROM services WHERE salon_id=?",
            Long.class, salonId);
        jdbc.update("INSERT INTO salon_staff (salon_id,name,is_active) "
                + "VALUES (?,'Promotion Stylist',TRUE)", salonId);
        long staffId = jdbc.queryForObject("SELECT id FROM salon_staff WHERE salon_id=?",
            Long.class, salonId);
        jdbc.update("INSERT INTO staff_services (salon_id,staff_id,service_id) VALUES (?,?,?)",
            salonId, staffId, serviceId);
        LocalDate date = LocalDate.now().plusDays(15);
        jdbc.update("INSERT INTO staff_working_hours "
                + "(salon_id,staff_id,day_of_week,start_time,end_time) VALUES (?,?,?,?,?)",
            salonId, staffId, date.getDayOfWeek().getValue() % 7,
            java.sql.Time.valueOf("09:00:00"), java.sql.Time.valueOf("17:00:00"));
        jdbc.update("INSERT INTO promotions (salon_id,code,code_normalized,discount_type,"
                + "discount_value,starts_at,ends_at,total_limit,minimum_spend,is_active) "
                + "VALUES (?,'ONEONLY','ONEONLY','FIXED',5.00,?,?,1,0,TRUE)",
            salonId, java.sql.Timestamp.from(Instant.now().minusSeconds(60)),
            java.sql.Timestamp.from(Instant.now().plusSeconds(3600)));
        String host = subdomain + ".localhost";
        List<HttpRequest> requests = List.of(
            new HttpRequest(host, firstToken, bookingRequest(staffId, serviceId, date, 10)),
            new HttpRequest(host, secondToken, bookingRequest(staffId, serviceId, date, 11)));

        List<HttpResult> results = runSimultaneously(requests);
        assertThat(results.stream().filter(result -> result.status() == 201)).hasSize(1);
        List<HttpResult> conflicts = results.stream()
            .filter(result -> result.status() == 409).toList();
        assertThat(conflicts).hasSize(1);
        HttpResult conflict = conflicts.get(0);
        assertThat(json.readTree(conflict.body()).get("error").asText())
            .isEqualTo("PROMOTION_LIMIT_REACHED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM bookings WHERE salon_id=?",
            Integer.class, salonId)).isOne();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM promotion_redemptions "
                + "WHERE salon_id=? AND status='RESERVED'", Integer.class, salonId)).isOne();
    }

    private static String bookingRequest(long staffId, long serviceId, LocalDate date, int hour) {
        return "{\"staffId\":" + staffId + ",\"serviceId\":" + serviceId
            + ",\"startDatetime\":\"" + date + "T" + String.format("%02d", hour)
            + ":00:00\",\"promoCode\":\"ONEONLY\"}";
    }

    private List<HttpResult> runSimultaneously(int count, String host, String token,
                                               String body) throws Exception {
        List<HttpRequest> requests = new ArrayList<>();
        for (int index = 0; index < count; index++)
            requests.add(new HttpRequest(host, token, body));
        return runSimultaneously(requests);
    }

    private List<HttpResult> runSimultaneously(List<HttpRequest> requests) throws Exception {
        int count = requests.size();
        ExecutorService executor = Executors.newFixedThreadPool(count);
        CyclicBarrier barrier = new CyclicBarrier(count);
        try {
            List<Callable<HttpResult>> calls = new ArrayList<>();
            for (HttpRequest request : requests) {
                calls.add(() -> {
                    barrier.await(20, TimeUnit.SECONDS);
                    var response = mockMvc.perform(post("/api/salon/bookings")
                            .header("Host", request.host())
                            .cookie(new Cookie("auth_token", request.token()))
                            .contentType(MediaType.APPLICATION_JSON).content(request.body()))
                        .andReturn().getResponse();
                    return new HttpResult(response.getStatus(), response.getContentAsString());
                });
            }
            List<Future<HttpResult>> futures = new ArrayList<>();
            for (Callable<HttpResult> call : calls) futures.add(executor.submit(call));
            List<HttpResult> results = new ArrayList<>();
            for (Future<HttpResult> future : futures)
                results.add(future.get(60, TimeUnit.SECONDS));
            return results;
        } finally {
            executor.shutdownNow();
        }
    }

    private String signup(String email, String role) {
        return testUsers.create(email,
            com.hairsaloon.auth.UserRole.valueOf(role)).token();
    }

    private record HttpRequest(String host, String token, String body) {}
    private record HttpResult(int status, String body) {}
}
