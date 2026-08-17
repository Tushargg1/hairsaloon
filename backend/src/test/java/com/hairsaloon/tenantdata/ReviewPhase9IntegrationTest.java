package com.hairsaloon.tenantdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:phase9;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.data.redis.repositories.enabled=false",
    "app.base-domain=localhost", "app.platform-hosts=localhost",
    "app.auth.jwt.secret=raw:0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-extra-secret",
    "app.auth.jwt.issuer=phase9-test", "app.auth.jwt.ttl=2h",
    "app.auth.cookie.domain=.localhost", "app.auth.cookie.secure=false",
    "app.auth.bootstrap-platform-admin.enabled=false"
})
@AutoConfigureMockMvc
class ReviewPhase9IntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM reviews");
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
    void publicListingIsAnonymousDefaultsEmptyAndNeverLeaksIdentifiers() throws Exception {
        Fixture salon = fixture("publicempty");
        mockMvc.perform(get("/api/salon/reviews").header("Host", salon.host()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content.length()").value(0))
            .andExpect(jsonPath("$.summary.averageRating").value(0.0))
            .andExpect(jsonPath("$.summary.totalReviews").value(0))
            .andExpect(jsonPath("$.summary.ratingDistribution['1']").value(0))
            .andExpect(jsonPath("$.summary.ratingDistribution['5']").value(0))
            .andExpect(jsonPath("$.page.number").value(0))
            .andExpect(jsonPath("$.page.size").value(20))
            .andExpect(jsonPath("$.page.totalElements").value(0))
            .andExpect(jsonPath("$.page.totalPages").value(0))
            .andExpect(jsonPath("$.page.first").value(true))
            .andExpect(jsonPath("$.page.last").value(true));
    }

    @Test
    void listingPaginatesNewestFirstAndCalculatesTenantSummaryDistribution() throws Exception {
        Fixture salon = fixture("listing");
        Fixture other = fixture("listingother");
        long first = completedBooking(salon, salon.customerId());
        long second = completedBooking(salon, salon.customerId());
        long third = completedBooking(salon, salon.customerId());
        insertReview(salon, first, 1, "Old", "2026-01-01T10:00:00Z");
        insertReview(salon, second, 5, "Same-time lower id", "2026-01-02T10:00:00Z");
        insertReview(salon, third, 4, "Newest id", "2026-01-02T10:00:00Z");
        long foreignBooking = completedBooking(other, other.customerId());
        insertReview(other, foreignBooking, 2, "Foreign", "2026-01-03T10:00:00Z");

        MvcResult result = mockMvc.perform(get("/api/salon/reviews")
                .header("Host", salon.host()).param("page", "0").param("size", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].comment").value("Newest id"))
            .andExpect(jsonPath("$.content[0].reviewer").value("Verified customer"))
            .andExpect(jsonPath("$.content[1].comment").value("Same-time lower id"))
            .andExpect(jsonPath("$.summary.averageRating").value(3.3333333333333335))
            .andExpect(jsonPath("$.summary.totalReviews").value(3))
            .andExpect(jsonPath("$.summary.ratingDistribution['1']").value(1))
            .andExpect(jsonPath("$.summary.ratingDistribution['2']").value(0))
            .andExpect(jsonPath("$.summary.ratingDistribution['4']").value(1))
            .andExpect(jsonPath("$.summary.ratingDistribution['5']").value(1))
            .andExpect(jsonPath("$.page.number").value(0))
            .andExpect(jsonPath("$.page.size").value(2))
            .andExpect(jsonPath("$.page.totalElements").value(3))
            .andExpect(jsonPath("$.page.totalPages").value(2))
            .andExpect(jsonPath("$.page.first").value(true))
            .andExpect(jsonPath("$.page.last").value(false)).andReturn();
        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("email", "customerId", "bookingId", "userId", "Foreign");

        mockMvc.perform(get("/api/salon/reviews").header("Host", salon.host())
                .param("page", "1").param("size", "2"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1))
            .andExpect(jsonPath("$.content[0].comment").value("Old"))
            .andExpect(jsonPath("$.page.last").value(true));
    }

    @Test
    void submissionRequiresCorrectTenantCustomerAndCompletedStatus() throws Exception {
        Fixture salon = fixture("submit");
        Fixture other = fixture("submitother");
        long completed = completedBooking(salon, salon.customerId());
        long foreign = completedBooking(other, other.customerId());
        String anotherCustomerEmail = "submit-another-customer@example.com";
        signup(anotherCustomerEmail, "CUSTOMER");
        long anotherCustomerId = jdbc.queryForObject("SELECT id FROM users WHERE email=?",
            Long.class, anotherCustomerEmail);
        long anotherCustomersBooking = completedBooking(salon, anotherCustomerId);
        long confirmed = booking(salon, salon.customerId(), "CONFIRMED");
        long cancelled = booking(salon, salon.customerId(), "CANCELLED");
        long noShow = booking(salon, salon.customerId(), "NO_SHOW");

        mockMvc.perform(post("/api/salon/reviews").header("Host", salon.host())
                .contentType(MediaType.APPLICATION_JSON).content(reviewJson(completed, 5, null)))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/salon/reviews").header("Host", salon.host())
                .cookie(cookie(salon.ownerToken())).contentType(MediaType.APPLICATION_JSON)
                .content(reviewJson(completed, 5, null)))
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/salon/reviews").header("Host", salon.host())
                .cookie(cookie(other.customerToken())).contentType(MediaType.APPLICATION_JSON)
                .content(reviewJson(completed, 5, null)))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.error")
                .value("BOOKING_NOT_FOUND"));
        for (long unavailableBooking : new long[] {foreign, anotherCustomersBooking}) {
            mockMvc.perform(post("/api/salon/reviews").header("Host", salon.host())
                    .cookie(cookie(salon.customerToken())).contentType(MediaType.APPLICATION_JSON)
                    .content(reviewJson(unavailableBooking, 5, null)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.error")
                    .value("BOOKING_NOT_FOUND"));
        }
        for (long incompleteBooking : new long[] {confirmed, cancelled, noShow}) {
            mockMvc.perform(post("/api/salon/reviews").header("Host", salon.host())
                    .cookie(cookie(salon.customerToken())).contentType(MediaType.APPLICATION_JSON)
                    .content(reviewJson(incompleteBooking, 5, null)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.error")
                    .value("BOOKING_NOT_COMPLETED"));
        }
    }

    @Test
    void validatesAndSanitizesCommentAndBookingResponseReportsReviewed() throws Exception {
        Fixture salon = fixture("validation");
        long completed = completedBooking(salon, salon.customerId());
        for (String invalid : new String[] {
                "{}", "{\"bookingId\":null,\"rating\":5}",
                "{\"bookingId\":0,\"rating\":5}",
                "{\"bookingId\":" + completed + ",\"rating\":0}",
                "{\"bookingId\":" + completed + ",\"rating\":6}"}) {
            mockMvc.perform(post("/api/salon/reviews").header("Host", salon.host())
                    .cookie(cookie(salon.customerToken())).contentType(MediaType.APPLICATION_JSON)
                    .content(invalid))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error")
                    .value("VALIDATION_ERROR"));
        }
        mockMvc.perform(post("/api/salon/reviews").header("Host", salon.host())
                .cookie(cookie(salon.customerToken())).contentType(MediaType.APPLICATION_JSON)
                .content("{\"bookingId\":" + completed
                    + ",\"rating\":5,\"unexpected\":true}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error")
                .value("BAD_REQUEST")).andExpect(jsonPath("$.message")
                    .value("Malformed request body"));

        String oversized = "x".repeat(1001);
        mockMvc.perform(post("/api/salon/reviews").header("Host", salon.host())
                .cookie(cookie(salon.customerToken())).contentType(MediaType.APPLICATION_JSON)
                .content(reviewJson(completed, 5, oversized)))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error")
                .value("VALIDATION_ERROR")).andExpect(jsonPath("$.fieldErrors.comment").exists());

        mockMvc.perform(post("/api/salon/reviews").header("Host", salon.host())
                .cookie(cookie(salon.customerToken())).contentType(MediaType.APPLICATION_JSON)
                .content("{\"bookingId\":" + completed
                    + ",\"rating\":5,\"comment\":\"  <b>Great</b>\\u0001 cut  \"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.rating").value(5))
            .andExpect(jsonPath("$.comment").value("Great cut"))
            .andExpect(jsonPath("$.reviewer").value("Verified customer"));
        assertThat(jdbc.queryForObject("SELECT comment FROM reviews WHERE salon_id=?",
            String.class, salon.salonId())).isEqualTo("Great cut");

        mockMvc.perform(get("/api/salon/bookings/me").header("Host", salon.host())
                .cookie(cookie(salon.customerToken())))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(completed))
            .andExpect(jsonPath("$[0].reviewed").value(true));
    }

    @Test
    void duplicateSubmissionAlwaysReturnsStableConflictAndPageBoundsAreValidated()
            throws Exception {
        Fixture salon = fixture("duplicate");
        long completed = completedBooking(salon, salon.customerId());
        String request = reviewJson(completed, 4, "First");
        mockMvc.perform(post("/api/salon/reviews").header("Host", salon.host())
                .cookie(cookie(salon.customerToken())).contentType(MediaType.APPLICATION_JSON)
                .content(request)).andExpect(status().isCreated());
        mockMvc.perform(post("/api/salon/reviews").header("Host", salon.host())
                .cookie(cookie(salon.customerToken())).contentType(MediaType.APPLICATION_JSON)
                .content(request))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.error")
                .value("REVIEW_EXISTS"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM reviews WHERE salon_id=?",
            Integer.class, salon.salonId())).isOne();

        mockMvc.perform(get("/api/salon/reviews").header("Host", salon.host())
                .param("page", "-1"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error")
                .value("VALIDATION_ERROR"));
        mockMvc.perform(get("/api/salon/reviews").header("Host", salon.host())
                .param("size", "101"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error")
                .value("VALIDATION_ERROR"));
    }

    @Test
    void dashboardReviewsVerifyOwnerOnEveryMethodAndReturnSameShape() throws Exception {
        Fixture salon = fixture("dashboardreviews");
        Fixture other = fixture("dashboardother");
        long completed = completedBooking(salon, salon.customerId());
        insertReview(salon, completed, 5, "Dashboard", "2026-02-01T10:00:00Z");

        mockMvc.perform(get("/api/salon/dashboard/reviews").header("Host", salon.host()))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/salon/dashboard/reviews").header("Host", salon.host())
                .cookie(cookie(salon.customerToken())))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/salon/dashboard/reviews").header("Host", salon.host())
                .cookie(cookie(other.ownerToken())))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").value("FORBIDDEN"));
        mockMvc.perform(get("/api/salon/dashboard/reviews").header("Host", salon.host())
                .cookie(cookie(salon.ownerToken())))
            .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].comment")
                .value("Dashboard")).andExpect(jsonPath("$.summary.totalReviews").value(1))
            .andExpect(jsonPath("$.page.size").value(20));
    }

    private Fixture fixture(String label) throws Exception {
        String ownerEmail = label + "-owner@example.com";
        String customerEmail = label + "-customer@example.com";
        String ownerToken = signup(ownerEmail, "SALON_OWNER");
        String customerToken = signup(customerEmail, "CUSTOMER");
        long ownerId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class,
            ownerEmail);
        long customerId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class,
            customerEmail);
        String subdomain = label + "salon";
        jdbc.update("INSERT INTO salons "
                + "(owner_id,subdomain,name,address,city,timezone,status,"
                + "cancellation_window_minutes,created_at) "
                + "VALUES (?,?,?,?,?,'UTC','ACTIVE',120,CURRENT_TIMESTAMP)",
            ownerId, subdomain, label + " Salon", "1 Main", "City");
        long salonId = jdbc.queryForObject("SELECT id FROM salons WHERE owner_id=?",
            Long.class, ownerId);
        jdbc.update("INSERT INTO services "
                + "(salon_id,name,duration_minutes,price,category,is_active,created_at) "
                + "VALUES (?,'Cut',30,35.00,'Hair',TRUE,CURRENT_TIMESTAMP)", salonId);
        long serviceId = jdbc.queryForObject("SELECT id FROM services WHERE salon_id=?",
            Long.class, salonId);
        jdbc.update("INSERT INTO salon_staff "
                + "(salon_id,name,is_active,created_at) VALUES (?,'Taylor',TRUE,CURRENT_TIMESTAMP)",
            salonId);
        long staffId = jdbc.queryForObject("SELECT id FROM salon_staff WHERE salon_id=?",
            Long.class, salonId);
        return new Fixture(salonId, customerId, staffId, serviceId,
            subdomain + ".localhost", ownerToken, customerToken);
    }

    private long completedBooking(Fixture fixture, long customerId) {
        return booking(fixture, customerId, "COMPLETED");
    }

    private long booking(Fixture fixture, long customerId, String status) {
        LocalDateTime start = LocalDateTime.now().minusDays(2)
            .plusMinutes(jdbc.queryForObject("SELECT COUNT(*) FROM bookings", Integer.class))
            .withSecond(0).withNano(0);
        jdbc.update("INSERT INTO bookings (salon_id,customer_id,staff_id,service_id,"
                + "start_datetime,end_datetime,status,price_snapshot,service_name_snapshot,created_at) "
                + "VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)", fixture.salonId(), customerId,
            fixture.staffId(), fixture.serviceId(), start, start.plusMinutes(30), status,
            new java.math.BigDecimal("35.00"), "Cut");
        return jdbc.queryForObject("SELECT MAX(id) FROM bookings WHERE salon_id=?",
            Long.class, fixture.salonId());
    }

    private void insertReview(Fixture fixture, long bookingId, int rating, String comment,
                              String createdAt) {
        jdbc.update("INSERT INTO reviews (salon_id,booking_id,customer_id,rating,comment,created_at) "
                + "VALUES (?,?,?,?,?,CAST(? AS TIMESTAMP WITH TIME ZONE))",
            fixture.salonId(), bookingId, fixture.customerId(), rating, comment, createdAt);
    }

    private String signup(String email, String role) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/platform/auth/signup")
                .header("Host", "localhost").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email
                    + "\",\"password\":\"Password123!\",\"role\":\"" + role + "\"}"))
            .andExpect(status().isCreated()).andReturn();
        String header = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        return header.substring("auth_token=".length(), header.indexOf(';'));
    }

    private String reviewJson(long bookingId, int rating, String comment) throws Exception {
        var body = json.createObjectNode().put("bookingId", bookingId).put("rating", rating);
        if (comment != null) body.put("comment", comment);
        return json.writeValueAsString(body);
    }

    private static Cookie cookie(String token) { return new Cookie("auth_token", token); }

    record Fixture(long salonId, long customerId, long staffId, long serviceId,
                   String host, String ownerToken, String customerToken) {}
}
