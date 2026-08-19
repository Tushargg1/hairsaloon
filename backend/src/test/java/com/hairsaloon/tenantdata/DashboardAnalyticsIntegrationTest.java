package com.hairsaloon.tenantdata;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:phase8;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.data.redis.repositories.enabled=false",
    "app.base-domain=localhost", "app.platform-hosts=localhost",
    "app.auth.jwt.secret=raw:0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-extra-secret",
    "app.auth.jwt.issuer=phase8-test", "app.auth.jwt.ttl=2h",
    "app.auth.cookie.domain=.localhost", "app.auth.cookie.secure=false",
    "app.auth.bootstrap-platform-admin.enabled=false"
})
@AutoConfigureMockMvc
@Import(DashboardAnalyticsIntegrationTest.FixedTime.class)
class DashboardAnalyticsIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired com.hairsaloon.auth.TestUserFactory testUsers;

    @TestConfiguration(proxyBeanMethods = false)
    static class FixedTime {
        @Bean @Primary Clock phase8Clock() {
            return Clock.fixed(Instant.parse("2026-03-01T23:30:00Z"), ZoneOffset.UTC);
        }
    }

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM notification_outbox");
        jdbc.update("DELETE FROM bookings");
        jdbc.update("DELETE FROM staff_services");
        jdbc.update("DELETE FROM staff_working_hours");
        jdbc.update("DELETE FROM staff_time_off");
        jdbc.update("DELETE FROM salon_staff");
        jdbc.update("DELETE FROM services");
        jdbc.update("DELETE FROM salons");
        jdbc.update("DELETE FROM users");
    }

    @Test
    void rejectsAnAuthenticatedOwnerWhoDoesNotOwnTheHostSalon() throws Exception {
        Fixture salon = fixture("owned", "UTC");
        Fixture other = fixture("foreign", "UTC");
        mockMvc.perform(get("/api/salon/dashboard/analytics").header("Host", salon.host())
                .cookie(cookie(other.ownerToken())))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error").value("FORBIDDEN"));
    }

    @Test
    void isolatesTenantsAndCalculatesExactStatusRevenueAndNoShowTotals() throws Exception {
        Fixture salon = fixture("metrics", "Asia/Kolkata");
        Fixture other = fixture("metricsother", "Asia/Kolkata");
        insert(salon, "2026-03-02T09:00:00", "COMPLETED", "20.00");
        insert(salon, "2026-03-08T18:00:00", "COMPLETED", "30.00");
        insert(salon, "2026-03-04T10:00:00", "CONFIRMED", "40.00");
        insert(salon, "2026-03-05T10:00:00", "CANCELLED", "50.00");
        insert(salon, "2026-03-06T10:00:00", "NO_SHOW", "60.00");
        insert(salon, "2026-03-01T23:59:00", "COMPLETED", "500.00");
        insert(other, "2026-03-03T10:00:00", "COMPLETED", "999.00");

        mockMvc.perform(get("/api/salon/dashboard/analytics").header("Host", salon.host())
                .cookie(cookie(salon.ownerToken())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.bookingsThisWeek").value(5))
            .andExpect(jsonPath("$.revenue").value(50.00))
            .andExpect(jsonPath("$.noShowRate").value(33.33))
            .andExpect(jsonPath("$.completedBookings").value(2))
            .andExpect(jsonPath("$.confirmedBookings").value(1))
            .andExpect(jsonPath("$.cancelledBookings").value(1))
            .andExpect(jsonPath("$.noShowBookings").value(1))
            .andExpect(jsonPath("$.rangeStart").value("2026-03-02"))
            .andExpect(jsonPath("$.rangeEnd").value("2026-03-08"))
            .andExpect(jsonPath("$.currency").value("USD"));
    }

    @Test
    void emptySalonReturnsZeroesWithoutDividingByZero() throws Exception {
        Fixture salon = fixture("empty", "UTC");
        mockMvc.perform(get("/api/salon/dashboard/analytics").header("Host", salon.host())
                .cookie(cookie(salon.ownerToken())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.bookingsThisWeek").value(0))
            .andExpect(jsonPath("$.revenue").value(0.00))
            .andExpect(jsonPath("$.noShowRate").value(0.00))
            .andExpect(jsonPath("$.completedBookings").value(0))
            .andExpect(jsonPath("$.confirmedBookings").value(0))
            .andExpect(jsonPath("$.cancelledBookings").value(0))
            .andExpect(jsonPath("$.noShowBookings").value(0));
    }
    @Test
    void salonTimezoneSelectsMondaySundayAndUsesHalfOpenDatabaseBoundaries()
            throws Exception {
        Fixture kolkata = fixture("kolkata", "Asia/Kolkata");
        Fixture newYork = fixture("newyork", "America/New_York");
        insert(kolkata, "2026-03-02T00:00:00", "CONFIRMED", "10.00");
        insert(kolkata, "2026-03-01T23:59:00", "CONFIRMED", "10.00");
        insert(kolkata, "2026-03-09T00:00:00", "CONFIRMED", "10.00");

        mockMvc.perform(get("/api/salon/dashboard/analytics").header("Host", kolkata.host())
                .cookie(cookie(kolkata.ownerToken())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rangeStart").value("2026-03-02"))
            .andExpect(jsonPath("$.rangeEnd").value("2026-03-08"))
            .andExpect(jsonPath("$.bookingsThisWeek").value(1));
        mockMvc.perform(get("/api/salon/dashboard/analytics").header("Host", newYork.host())
                .cookie(cookie(newYork.ownerToken())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rangeStart").value("2026-02-23"))
            .andExpect(jsonPath("$.rangeEnd").value("2026-03-01"));
    }

    @Test
    void customInclusiveRangeIsBoundedZeroFilledAndIncludesAllBreakdowns() throws Exception {
        Fixture salon = fixture("customrange", "Pacific/Auckland");
        insert(salon, "2026-04-01T09:00:00", "COMPLETED", "25.00");
        insert(salon, "2026-04-03T09:00:00", "CONFIRMED", "25.00");
        mockMvc.perform(get("/api/salon/dashboard/analytics").header("Host", salon.host())
                .cookie(cookie(salon.ownerToken())).param("startDate", "2026-04-01")
                .param("endDate", "2026-04-03"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rangeStart").value("2026-04-01"))
            .andExpect(jsonPath("$.rangeEnd").value("2026-04-03"))
            .andExpect(jsonPath("$.dailySeries.length()").value(3))
            .andExpect(jsonPath("$.dailySeries[1].date").value("2026-04-02"))
            .andExpect(jsonPath("$.dailySeries[1].bookings").value(0))
            .andExpect(jsonPath("$.dailySeries[1].revenue").value(0.00))
            .andExpect(jsonPath("$.serviceBreakdown[0].name").value("Cut"))
            .andExpect(jsonPath("$.serviceBreakdown[0].bookings").value(2))
            .andExpect(jsonPath("$.staffBreakdown[0].name").value("Taylor"))
            .andExpect(jsonPath("$.statusBreakdown.COMPLETED").value(1))
            .andExpect(jsonPath("$.statusBreakdown.CONFIRMED").value(1))
            .andExpect(jsonPath("$.revenue").value(25.00));
        mockMvc.perform(get("/api/salon/dashboard/analytics").header("Host", salon.host())
                .cookie(cookie(salon.ownerToken())).param("startDate", "2025-01-01")
                .param("endDate", "2026-01-02"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
    }

    private Fixture fixture(String label, String timezone) throws Exception {
        String ownerEmail = label + "-owner@example.com";
        String customerEmail = label + "-customer@example.com";
        String ownerToken = signup(ownerEmail, "SALON_OWNER");
        signup(customerEmail, "CUSTOMER");
        long ownerId = jdbc.queryForObject("SELECT id FROM users WHERE email=?",
            Long.class, ownerEmail);
        long customerId = jdbc.queryForObject("SELECT id FROM users WHERE email=?",
            Long.class, customerEmail);
        String subdomain = label + "salon";
        jdbc.update("INSERT INTO salons "
                + "(owner_id,subdomain,name,address,city,timezone,status,"
                + "cancellation_window_minutes,created_at) "
                + "VALUES (?,?,?,?,?,?,'ACTIVE',120,CURRENT_TIMESTAMP)",
            ownerId, subdomain, label + " Salon", "1 Main", "City", timezone);
        long salonId = jdbc.queryForObject("SELECT id FROM salons WHERE owner_id=?",
            Long.class, ownerId);
        jdbc.update("INSERT INTO services "
                + "(salon_id,name,duration_minutes,price,category,is_active,created_at) "
                + "VALUES (?,'Cut',30,25.00,'Hair',TRUE,CURRENT_TIMESTAMP)", salonId);
        long serviceId = jdbc.queryForObject("SELECT id FROM services WHERE salon_id=?",
            Long.class, salonId);
        jdbc.update("INSERT INTO salon_staff "
                + "(salon_id,name,is_active,created_at) VALUES (?,'Taylor',TRUE,CURRENT_TIMESTAMP)",
            salonId);
        long staffId = jdbc.queryForObject("SELECT id FROM salon_staff WHERE salon_id=?",
            Long.class, salonId);
        return new Fixture(salonId, customerId, staffId, serviceId,
            subdomain + ".localhost", ownerToken);
    }

    private void insert(Fixture fixture, String start, String status, String price) {
        LocalDateTime startAt = LocalDateTime.parse(start);
        jdbc.update("INSERT INTO bookings (salon_id,customer_id,staff_id,service_id,"
                + "start_datetime,end_datetime,status,price_snapshot,service_name_snapshot,created_at) "
                + "VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)", fixture.salonId(),
            fixture.customerId(), fixture.staffId(), fixture.serviceId(), startAt,
            startAt.plusMinutes(30), status, new java.math.BigDecimal(price), "Cut");
    }

    private String signup(String email, String role) {
        return testUsers.create(email,
            com.hairsaloon.auth.UserRole.valueOf(role)).token();
    }

    private static Cookie cookie(String token) { return new Cookie("auth_token", token); }

    record Fixture(long salonId, long customerId, long staffId, long serviceId,
                   String host, String ownerToken) {}
}
