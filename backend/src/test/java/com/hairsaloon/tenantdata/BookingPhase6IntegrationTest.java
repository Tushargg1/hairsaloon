package com.hairsaloon.tenantdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.time.LocalDate;
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
    "spring.datasource.url=jdbc:h2:mem:phase6;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.data.redis.repositories.enabled=false",
    "app.base-domain=localhost", "app.platform-hosts=localhost",
    "app.auth.jwt.secret=raw:0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-extra-secret",
    "app.auth.jwt.issuer=phase6-test", "app.auth.jwt.ttl=2h",
    "app.auth.cookie.domain=.localhost", "app.auth.cookie.secure=false",
    "app.auth.bootstrap-platform-admin.enabled=false"
})
@AutoConfigureMockMvc
class BookingPhase6IntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired com.hairsaloon.auth.TestUserFactory testUsers;

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM promotion_redemptions");
        jdbc.update("DELETE FROM promotion_services");
        jdbc.update("DELETE FROM promotions");
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
    void availabilityBookingIdempotencyListingAndCancellationUseServerData() throws Exception {
        Fixture fixture = fixture("booking");
        LocalDate date = LocalDate.now().plusDays(14);
        addHours(fixture, date, "09:00", "10:00");

        mockMvc.perform(get("/api/salon/availability").header("Host", fixture.host())
                .param("serviceId", Long.toString(fixture.serviceId()))
                .param("date", date.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].staffId")
                .value(fixture.staffId())).andExpect(jsonPath("$[0].staffName").value("Taylor"))
            .andExpect(jsonPath("$.length()").value(3));

        String body = bookingJson(fixture, date.atTime(9, 0));
        MvcResult created = mockMvc.perform(post("/api/salon/bookings")
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken()))
                .header("Idempotency-Key", "phase6-key")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.price").value(35.00))
            .andExpect(jsonPath("$.serviceName").value("Cut"))
            .andExpect(jsonPath("$.status").value("CONFIRMED")).andReturn();
        long bookingId = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/salon/bookings")
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken()))
                .header("Idempotency-Key", "phase6-key")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(bookingId));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM bookings", Integer.class)).isOne();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification_outbox "
            + "WHERE salon_id=? AND booking_id=? AND notification_type='BOOKING_CONFIRMED'",
            Integer.class, fixture.salonId(), bookingId)).isEqualTo(2);

        mockMvc.perform(get("/api/salon/availability").header("Host", fixture.host())
                .param("serviceId", Long.toString(fixture.serviceId()))
                .param("date", date.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].startDatetime").value(date + "T09:30:00"));
        mockMvc.perform(get("/api/salon/bookings/me").header("Host", fixture.host())
                .cookie(cookie(fixture.customerToken())))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(bookingId));

        mockMvc.perform(patch("/api/salon/bookings/{id}/cancel", bookingId)
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken())))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification_outbox "
            + "WHERE salon_id=? AND booking_id=? AND notification_type='CUSTOMER_CANCELLED'",
            Integer.class, fixture.salonId(), bookingId)).isEqualTo(2);
    }

    @Test
    void rescheduleRevalidatesTimeOffAndDashboardMethodsVerifyOwner() throws Exception {
        Fixture fixture = fixture("manage");
        Fixture other = fixture("other");
        LocalDate date = LocalDate.now().plusDays(15);
        addHours(fixture, date, "09:00", "12:00");
        MvcResult created = mockMvc.perform(post("/api/salon/bookings")
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(bookingJson(fixture, date.atTime(9, 0))))
            .andExpect(status().isCreated()).andReturn();
        long id = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        jdbc.update("INSERT INTO staff_time_off "
                + "(salon_id,staff_id,start_datetime,end_datetime,reason,created_at) "
                + "VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)", fixture.salonId(), fixture.staffId(),
            date.atTime(10, 0), date.atTime(10, 30), "Away");

        mockMvc.perform(patch("/api/salon/bookings/{id}/reschedule", id)
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"startDatetime\":\"" + date + "T10:00:00\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.error")
                .value("STAFF_UNAVAILABLE"));
        assertThat(jdbc.queryForObject("SELECT start_datetime FROM bookings WHERE id=?",
            LocalDateTime.class, id)).isEqualTo(date.atTime(9, 0));

        for (var request : java.util.List.of(
                get("/api/salon/dashboard/bookings").param("date", date.toString()),
                patch("/api/salon/dashboard/bookings/{id}/status", id)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"NO_SHOW\"}"),
                patch("/api/salon/dashboard/bookings/{id}/cancel", id))) {
            mockMvc.perform(request.header("Host", fixture.host())
                    .cookie(cookie(other.ownerToken())))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").value("FORBIDDEN"));
        }

        mockMvc.perform(get("/api/salon/dashboard/bookings").header("Host", fixture.host())
                .cookie(cookie(fixture.ownerToken())).param("date", date.toString())
                .param("staffId", Long.toString(fixture.staffId())))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id));
        mockMvc.perform(patch("/api/salon/dashboard/bookings/{id}/cancel", id)
                .header("Host", fixture.host()).cookie(cookie(fixture.ownerToken())))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification_outbox "
            + "WHERE salon_id=? AND booking_id=? AND notification_type='OWNER_CANCELLED'",
            Integer.class, fixture.salonId(), id)).isEqualTo(2);
    }

    @Test
    void successfulRescheduleCreatesNotificationsForBothParties() throws Exception {
        Fixture fixture = fixture("notifyreschedule");
        LocalDate date = LocalDate.now().plusDays(16);
        addHours(fixture, date, "09:00", "12:00");
        long id = createBooking(fixture, date.atTime(9, 0));
        mockMvc.perform(patch("/api/salon/bookings/{id}/reschedule", id)
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"startDatetime\":\"" + date + "T10:00:00\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.startDatetime").value(date + "T10:00:00"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification_outbox "
            + "WHERE salon_id=? AND booking_id=? AND notification_type='BOOKING_RESCHEDULED'",
            Integer.class, fixture.salonId(), id)).isEqualTo(2);
    }

    @Test
    void ownerCreatesCustomerlessWalkInWithGuestCalendarFieldsAndNoReview() throws Exception {
        Fixture fixture = fixture("walkin");
        LocalDate date = LocalDate.now().plusDays(12);
        addHours(fixture, date, "09:00", "10:00");
        int usersBefore = jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
        String body = "{\"staffId\":" + fixture.staffId() + ",\"serviceId\":"
            + fixture.serviceId() + ",\"startDatetime\":\"" + date
            + "T09:00:00\",\"guestName\":\" Guest Person \","
            + "\"guestPhone\":\"+1 555 123 4567\"}";
        MvcResult result = mockMvc.perform(post("/api/salon/dashboard/bookings/walk-ins")
                .header("Host", fixture.host()).cookie(cookie(fixture.ownerToken()))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.customerId").doesNotExist())
            .andExpect(jsonPath("$.bookingSource").value("WALK_IN"))
            .andExpect(jsonPath("$.guestName").value("Guest Person"))
            .andExpect(jsonPath("$.guestPhone").value("+1 555 123 4567"))
            .andExpect(jsonPath("$.originalPrice").value(35.00))
            .andExpect(jsonPath("$.discountAmount").value(0.00)).andReturn();
        long id = json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class))
            .isEqualTo(usersBefore);
        mockMvc.perform(get("/api/salon/dashboard/bookings").header("Host", fixture.host())
                .cookie(cookie(fixture.ownerToken())).param("date", date.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].guestName")
                .value("Guest Person"));
        mockMvc.perform(post("/api/salon/reviews").header("Host", fixture.host())
                .cookie(cookie(fixture.customerToken())).contentType(MediaType.APPLICATION_JSON)
                .content("{\"bookingId\":" + id + ",\"rating\":5}"))
            .andExpect(status().isNotFound());
        mockMvc.perform(patch("/api/salon/dashboard/bookings/{id}/cancel", id)
                .header("Host", fixture.host()).cookie(cookie(fixture.ownerToken())))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        mockMvc.perform(patch("/api/salon/dashboard/bookings/{id}/cancel", id)
                .header("Host", fixture.host()).cookie(cookie(fixture.ownerToken())))
            .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notification_outbox WHERE booking_id=?",
            Integer.class, id)).isZero();
    }

    @Test
    void promotionValidationBookingSnapshotsIdempotencyAndReleaseAreTransactional()
            throws Exception {
        Fixture fixture = fixture("promo");
        LocalDate date = LocalDate.now().plusDays(13);
        addHours(fixture, date, "09:00", "11:00");
        String promotion = "{\"code\":\" save20 \",\"discountType\":\"PERCENT\","
            + "\"discountValue\":20,\"startsAt\":\"" + Instant.now().minusSeconds(60)
            + "\",\"endsAt\":\"" + Instant.now().plusSeconds(86400)
            + "\",\"totalLimit\":1,\"perCustomerLimit\":1,\"minimumSpend\":30,"
            + "\"serviceIds\":[" + fixture.serviceId() + "]}";
        mockMvc.perform(post("/api/salon/dashboard/promotions").header("Host", fixture.host())
                .cookie(cookie(fixture.ownerToken())).contentType(MediaType.APPLICATION_JSON)
                .content(promotion))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.code").value("SAVE20"));
        mockMvc.perform(post("/api/salon/promotions/validate").header("Host", fixture.host())
                .cookie(cookie(fixture.customerToken())).contentType(MediaType.APPLICATION_JSON)
                .content("{\"promoCode\":\"save20\",\"serviceId\":"
                    + fixture.serviceId() + "}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.discountAmount").value(7.00))
            .andExpect(jsonPath("$.finalPrice").value(28.00));
        String booking = bookingJson(fixture, date.atTime(9, 0));
        booking = booking.substring(0, booking.length() - 1) + ",\"promoCode\":\"save20\"}";
        MvcResult created = mockMvc.perform(post("/api/salon/bookings")
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken()))
                .header("Idempotency-Key", "promo-booking")
                .contentType(MediaType.APPLICATION_JSON).content(booking))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.originalPrice").value(35.00))
            .andExpect(jsonPath("$.discountAmount").value(7.00))
            .andExpect(jsonPath("$.price").value(28.00))
            .andExpect(jsonPath("$.promoCode").value("SAVE20")).andReturn();
        long id = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        mockMvc.perform(post("/api/salon/bookings").header("Host", fixture.host())
                .cookie(cookie(fixture.customerToken())).header("Idempotency-Key", "promo-booking")
                .contentType(MediaType.APPLICATION_JSON).content(booking))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM promotion_redemptions WHERE booking_id=?",
            Integer.class, id)).isOne();
        mockMvc.perform(patch("/api/salon/bookings/{id}/cancel", id)
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken())))
            .andExpect(status().isOk());
        mockMvc.perform(patch("/api/salon/bookings/{id}/cancel", id)
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken())))
            .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM promotion_redemptions "
            + "WHERE booking_id=? AND status='RELEASED' AND released_at IS NOT NULL",
            Integer.class, id)).isOne();
    }

    private Fixture fixture(String label) throws Exception {
        String ownerEmail = label + "-owner@example.com";
        String customerEmail = label + "-customer@example.com";
        String ownerToken = signup(ownerEmail, "SALON_OWNER");
        String customerToken = signup(customerEmail, "CUSTOMER");
        long ownerId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class,
            ownerEmail);
        String subdomain = label + "salon";
        jdbc.update("INSERT INTO salons "
                + "(owner_id,subdomain,name,address,city,timezone,status,cancellation_window_minutes,created_at) "
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
        jdbc.update("INSERT INTO staff_services (salon_id,staff_id,service_id) "
            + "VALUES (?,?,?)", salonId, staffId, serviceId);
        return new Fixture(salonId, staffId, serviceId, subdomain + ".localhost",
            ownerToken, customerToken);
    }

    private void addHours(Fixture fixture, LocalDate date, String start, String end) {
        int day = date.getDayOfWeek().getValue() % 7;
        jdbc.update("INSERT INTO staff_working_hours "
                + "(salon_id,staff_id,day_of_week,start_time,end_time) VALUES (?,?,?,?,?)",
            fixture.salonId(), fixture.staffId(), day,
            java.sql.Time.valueOf(start + ":00"), java.sql.Time.valueOf(end + ":00"));
    }
    private String signup(String email, String role) {
        return testUsers.create(email,
            com.hairsaloon.auth.UserRole.valueOf(role)).token();
    }

    private static String bookingJson(Fixture fixture, LocalDateTime start) {
        return "{\"staffId\":" + fixture.staffId() + ",\"serviceId\":"
            + fixture.serviceId() + ",\"startDatetime\":\"" + start + ":00\"}";
    }

    private static Cookie cookie(String token) { return new Cookie("auth_token", token); }

    @Test
    void availabilityUsesSundayZeroAndExcludesTimeOffButNotCancelledBookings() throws Exception {
        Fixture fixture = fixture("edges");
        LocalDate sunday = LocalDate.now().plusDays(1);
        while (sunday.getDayOfWeek().getValue() % 7 != 0) sunday = sunday.plusDays(1);
        addHours(fixture, sunday, "09:00", "10:00");
        jdbc.update("INSERT INTO staff_time_off "
                + "(salon_id,staff_id,start_datetime,end_datetime,reason,created_at) "
                + "VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)", fixture.salonId(), fixture.staffId(),
            sunday.atTime(9, 15), sunday.atTime(9, 30), "Break");
        jdbc.update("INSERT INTO bookings (salon_id,customer_id,staff_id,service_id,"
                + "start_datetime,end_datetime,status,price_snapshot,service_name_snapshot,created_at) "
                + "SELECT ?,id,?,?,?,?,'CANCELLED',35.00,'Cut',CURRENT_TIMESTAMP "
                + "FROM users WHERE email='edges-customer@example.com'",
            fixture.salonId(), fixture.staffId(), fixture.serviceId(), sunday.atTime(9, 30),
            sunday.atTime(10, 0));

        mockMvc.perform(get("/api/salon/availability").header("Host", fixture.host())
                .param("serviceId", Long.toString(fixture.serviceId()))
                .param("staffId", Long.toString(fixture.staffId()))
                .param("date", sunday.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].startDatetime").value(sunday + "T09:30:00"));

        jdbc.update("UPDATE salon_staff SET is_active=FALSE WHERE id=? AND salon_id=?",
            fixture.staffId(), fixture.salonId());
        mockMvc.perform(get("/api/salon/availability").header("Host", fixture.host())
                .param("serviceId", Long.toString(fixture.serviceId()))
                .param("date", sunday.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));

        jdbc.update("UPDATE salon_staff SET is_active=TRUE WHERE id=? AND salon_id=?",
            fixture.staffId(), fixture.salonId());
        jdbc.update("DELETE FROM staff_services WHERE salon_id=? AND staff_id=? AND service_id=?",
            fixture.salonId(), fixture.staffId(), fixture.serviceId());
        mockMvc.perform(get("/api/salon/availability").header("Host", fixture.host())
                .param("serviceId", Long.toString(fixture.serviceId()))
                .param("staffId", Long.toString(fixture.staffId()))
                .param("date", sunday.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        jdbc.update("INSERT INTO staff_services (salon_id,staff_id,service_id) VALUES (?,?,?)",
            fixture.salonId(), fixture.staffId(), fixture.serviceId());
        jdbc.update("UPDATE services SET is_active=FALSE WHERE id=? AND salon_id=?",
            fixture.serviceId(), fixture.salonId());
        mockMvc.perform(get("/api/salon/availability").header("Host", fixture.host())
                .param("serviceId", Long.toString(fixture.serviceId()))
                .param("date", sunday.toString()))
            .andExpect(status().isNotFound());
    }

    @Test
    void customerAuthorizationOwnershipAndCancellationWindowAreEnforced() throws Exception {
        Fixture fixture = fixture("policy");
        LocalDate date = LocalDate.now().plusDays(1);
        addHours(fixture, date, "09:00", "11:00");
        String body = bookingJson(fixture, date.atTime(9, 0));
        mockMvc.perform(post("/api/salon/bookings").header("Host", fixture.host())
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/salon/bookings").header("Host", fixture.host())
                .cookie(cookie(fixture.ownerToken())).contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isForbidden());
        MvcResult created = mockMvc.perform(post("/api/salon/bookings")
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken()))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.staffName").value("Taylor"))
            .andReturn();
        long id = json.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        String stranger = signup("policy-stranger@example.com", "CUSTOMER");
        mockMvc.perform(patch("/api/salon/bookings/{id}/cancel", id)
                .header("Host", fixture.host()).cookie(cookie(stranger)))
            .andExpect(status().isNotFound());
        jdbc.update("UPDATE salons SET cancellation_window_minutes=2880 WHERE id=?",
            fixture.salonId());
        mockMvc.perform(patch("/api/salon/bookings/{id}/cancel", id)
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken())))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("CANCELLATION_WINDOW_CLOSED"));
    }

    @Test
    void rescheduleConflictRollsBackAndOwnerTransitionsAreLegal() throws Exception {
        Fixture fixture = fixture("lifecycle");
        LocalDate future = LocalDate.now().plusDays(10);
        addHours(fixture, future, "09:00", "12:00");
        long first = createBooking(fixture, future.atTime(9, 0));
        createBooking(fixture, future.atTime(10, 0));
        mockMvc.perform(patch("/api/salon/bookings/{id}/reschedule", first)
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"startDatetime\":\"" + future + "T10:00:00\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.error")
                .value("SLOT_UNAVAILABLE"));
        assertThat(jdbc.queryForObject("SELECT start_datetime FROM bookings WHERE id=?",
            LocalDateTime.class, first)).isEqualTo(future.atTime(9, 0));

        LocalDateTime past = LocalDateTime.now().minusDays(2).withSecond(0).withNano(0);
        long completed = insertConfirmed(fixture, past, past.plusMinutes(30));
        long noShow = insertConfirmed(fixture, past.plusHours(1), past.plusHours(1).plusMinutes(30));
        mockMvc.perform(patch("/api/salon/dashboard/bookings/{id}/status", completed)
                .header("Host", fixture.host()).cookie(cookie(fixture.ownerToken()))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"COMPLETED\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("COMPLETED"));
        mockMvc.perform(patch("/api/salon/dashboard/bookings/{id}/status", noShow)
                .header("Host", fixture.host()).cookie(cookie(fixture.ownerToken()))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"NO_SHOW\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("NO_SHOW"));
        mockMvc.perform(patch("/api/salon/dashboard/bookings/{id}/status", first)
                .header("Host", fixture.host()).cookie(cookie(fixture.ownerToken()))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"COMPLETED\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("BOOKING_TRANSITION_INVALID"));
    }

    @Test
    void ownerCanQueryInclusiveDateRangeAndEveryCallRejectsAnotherSalonOwner() throws Exception {
        Fixture fixture = fixture("range");
        Fixture other = fixture("rangeother");
        LocalDate firstDate = LocalDate.now().plusDays(20);
        addHours(fixture, firstDate, "09:00", "10:00");
        addHours(fixture, firstDate.plusDays(1), "09:00", "10:00");
        createBooking(fixture, firstDate.atTime(9, 0));
        createBooking(fixture, firstDate.plusDays(1).atTime(9, 0));
        mockMvc.perform(get("/api/salon/dashboard/bookings").header("Host", fixture.host())
                .cookie(cookie(fixture.ownerToken())).param("startDate", firstDate.toString())
                .param("endDate", firstDate.plusDays(1).toString())
                .param("staffId", Long.toString(fixture.staffId())))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(get("/api/salon/dashboard/bookings").header("Host", fixture.host())
                .cookie(cookie(other.ownerToken())).param("startDate", firstDate.toString())
                .param("endDate", firstDate.plusDays(1).toString()))
            .andExpect(status().isForbidden());
    }

    private long createBooking(Fixture fixture, LocalDateTime start) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/salon/bookings")
                .header("Host", fixture.host()).cookie(cookie(fixture.customerToken()))
                .contentType(MediaType.APPLICATION_JSON).content(bookingJson(fixture, start)))
            .andExpect(status().isCreated()).andReturn();
        return json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private long insertConfirmed(Fixture fixture, LocalDateTime start, LocalDateTime end) {
        jdbc.update("INSERT INTO bookings (salon_id,customer_id,staff_id,service_id,"
                + "start_datetime,end_datetime,status,price_snapshot,service_name_snapshot,created_at) "
                + "SELECT ?,id,?,?,?,?,'CONFIRMED',35.00,'Cut',CURRENT_TIMESTAMP "
                + "FROM users WHERE email=?", fixture.salonId(), fixture.staffId(),
            fixture.serviceId(), start, end,
            fixture.host().replace("salon.localhost", "-customer@example.com"));
        return jdbc.queryForObject("SELECT MAX(id) FROM bookings WHERE salon_id=?", Long.class,
            fixture.salonId());
    }

    record Fixture(long salonId, long staffId, long serviceId, String host,
                   String ownerToken, String customerToken) {}
}
