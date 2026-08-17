package com.hairsaloon.tenantdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.LocalDateTime;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(properties = {
    "spring.jpa.hibernate.ddl-auto=validate", "spring.flyway.enabled=true",
    "spring.data.redis.repositories.enabled=false", "spring.datasource.hikari.maximum-pool-size=25",
    "app.base-domain=localhost", "app.platform-hosts=localhost",
    "app.auth.jwt.secret=raw:0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-extra-secret",
    "app.auth.jwt.issuer=review-concurrency-it", "app.auth.jwt.ttl=2h",
    "app.auth.cookie.domain=.localhost", "app.auth.cookie.secure=false",
    "app.auth.bootstrap-platform-admin.enabled=false"
})
@AutoConfigureMockMvc
@EnabledIf("postgresAvailable")
class ReviewConcurrencyIT {
    static PostgreSQLContainer<?> postgres;

    static boolean postgresAvailable() {
        if (postgresUrl() != null) return true;
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (RuntimeException unavailable) {
            return false;
        }
    }
    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry properties) {
        String url = postgresUrl();
        if (url != null) {
            properties.add("spring.datasource.url", () -> url);
            properties.add("spring.datasource.username", () -> env(
                "TEST_POSTGRES_USERNAME", "TEST_POSTGRES_USER", "postgres"));
            properties.add("spring.datasource.password", () -> env(
                "TEST_POSTGRES_PASSWORD", null, "postgres"));
        } else {
            postgres = new PostgreSQLContainer<>("postgres:16.4-alpine")
                .withDatabaseName("hairsaloon_review_concurrency")
                .withUsername("hairsaloon").withPassword("hairsaloon");
            postgres.start();
            properties.add("spring.datasource.url", postgres::getJdbcUrl);
            properties.add("spring.datasource.username", postgres::getUsername);
            properties.add("spring.datasource.password", postgres::getPassword);
        }
    }

    @AfterAll
    static void stopContainer() {
        if (postgres != null) postgres.stop();
    }

    private static String postgresUrl() {
        String url = System.getenv("TEST_POSTGRES_URL");
        if (url == null || url.isBlank()) url = System.getenv("TEST_POSTGRES_JDBC_URL");
        return url == null || url.isBlank() ? null : url;
    }

    private static String postgresSource() {
        return postgresUrl() == null ? "docker" : "TEST_POSTGRES_*";
    }

    private static String env(String primary, String alternate, String fallback) {
        String value = System.getenv(primary);
        if ((value == null || value.isBlank()) && alternate != null)
            value = System.getenv(alternate);
        return value == null || value.isBlank() ? fallback : value;
    }

    @Autowired MockMvc mockMvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @Test
    void exactlyOneOfTwentySimultaneousHttpReviewsWinsTheDatabaseConstraint() throws Exception {
        String suffix = Long.toString(System.nanoTime(), 36);
        String subdomain = "reviewrace" + suffix;
        String ownerEmail = subdomain + "-owner@example.com";
        String customerEmail = subdomain + "-customer@example.com";
        signup(ownerEmail, "SALON_OWNER");
        String customerToken = signup(customerEmail, "CUSTOMER");

        long ownerId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class,
            ownerEmail);
        long customerId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class,
            customerEmail);
        jdbc.update("INSERT INTO salons "
                + "(owner_id,subdomain,name,address,city,timezone,status,cancellation_window_minutes) "
                + "VALUES (?,?,'Review Race Salon','1 Main','City','UTC','ACTIVE',120)",
            ownerId, subdomain);
        long salonId = jdbc.queryForObject("SELECT id FROM salons WHERE owner_id=?",
            Long.class, ownerId);
        jdbc.update("INSERT INTO services "
                + "(salon_id,name,duration_minutes,price,category,is_active) "
                + "VALUES (?,'Review Cut',30,40.00,'Hair',TRUE)", salonId);
        long serviceId = jdbc.queryForObject("SELECT id FROM services WHERE salon_id=?",
            Long.class, salonId);
        jdbc.update("INSERT INTO salon_staff (salon_id,name,is_active) "
            + "VALUES (?,'Review Stylist',TRUE)", salonId);
        long staffId = jdbc.queryForObject("SELECT id FROM salon_staff WHERE salon_id=?",
            Long.class, salonId);
        jdbc.update("INSERT INTO staff_services (salon_id,staff_id,service_id) VALUES (?,?,?)",
            salonId, staffId, serviceId);

        LocalDateTime start = LocalDateTime.now().minusDays(1).withNano(0);
        jdbc.update("INSERT INTO bookings (salon_id,customer_id,staff_id,service_id,"
                + "start_datetime,end_datetime,status,price_snapshot,service_name_snapshot) "
                + "VALUES (?,?,?,?,?,?,'COMPLETED',40.00,'Review Cut')",
            salonId, customerId, staffId, serviceId, start, start.plusMinutes(30));
        long bookingId = jdbc.queryForObject(
            "SELECT id FROM bookings WHERE salon_id=? AND customer_id=?", Long.class,
            salonId, customerId);
        String request = "{\"bookingId\":" + bookingId
            + ",\"rating\":5,\"comment\":\"Concurrency review\"}";

        List<HttpResult> results = runSimultaneously(20, subdomain + ".localhost",
            customerToken, request);
        assertThat(results.stream().filter(result -> result.status() == 201)).hasSize(1);
        List<HttpResult> conflicts = results.stream()
            .filter(result -> result.status() == 409).toList();
        assertThat(conflicts).hasSize(19);
        for (HttpResult conflict : conflicts) {
            assertThat(json.readTree(conflict.body()).get("error").asText())
                .isEqualTo("REVIEW_EXISTS");
        }
        assertThat(jdbc.queryForObject(
            "SELECT COUNT(*) FROM reviews WHERE salon_id=? AND booking_id=? AND customer_id=?",
            Integer.class, salonId, bookingId, customerId)).isOne();
        System.out.println("REVIEW_CONCURRENCY_POSTGRES_RAN=true source=" + postgresSource());
    }

    private List<HttpResult> runSimultaneously(int count, String host, String token,
                                               String body) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(count);
        CyclicBarrier barrier = new CyclicBarrier(count);
        try {
            List<Callable<HttpResult>> calls = new ArrayList<>();
            for (int index = 0; index < count; index++) {
                calls.add(() -> {
                    barrier.await(20, TimeUnit.SECONDS);
                    var response = mockMvc.perform(post("/api/salon/reviews")
                            .header("Host", host)
                            .cookie(new Cookie("auth_token", token))
                            .contentType(MediaType.APPLICATION_JSON).content(body))
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

    private String signup(String email, String role) throws Exception {
        var response = mockMvc.perform(post("/api/platform/auth/signup")
                .header("Host", "localhost").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email
                    + "\",\"password\":\"Password123!\",\"role\":\"" + role + "\"}"))
            .andReturn().getResponse();
        assertThat(response.getStatus()).isEqualTo(201);
        String header = response.getHeader(HttpHeaders.SET_COOKIE);
        return header.substring("auth_token=".length(), header.indexOf(';'));
    }

    private record HttpResult(int status, String body) {}
}
