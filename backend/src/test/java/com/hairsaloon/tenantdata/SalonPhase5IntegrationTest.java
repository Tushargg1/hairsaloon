package com.hairsaloon.tenantdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
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
    "spring.datasource.url=jdbc:h2:mem:phase5;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.data.redis.repositories.enabled=false",
    "app.base-domain=localhost", "app.platform-hosts=localhost",
    "app.auth.jwt.secret=raw:0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-extra-secret",
    "app.auth.jwt.issuer=phase5-test", "app.auth.jwt.ttl=2h",
    "app.auth.cookie.domain=.localhost", "app.auth.cookie.secure=false",
    "app.auth.bootstrap-platform-admin.enabled=false"
})
@AutoConfigureMockMvc
class SalonPhase5IntegrationTest {
    private static final AtomicInteger IDS = new AtomicInteger();
    @Autowired MockMvc mockMvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired com.hairsaloon.auth.TestUserFactory testUsers;
    private int run;

    @BeforeEach
    void clean() {
        run = IDS.incrementAndGet();
        jdbc.update("DELETE FROM staff_services");
        jdbc.update("DELETE FROM staff_working_hours");
        jdbc.update("DELETE FROM staff_time_off");
        jdbc.update("DELETE FROM salon_staff");
        jdbc.update("DELETE FROM services");
        jdbc.update("DELETE FROM salon_photos");
        jdbc.update("DELETE FROM salons");
        jdbc.update("DELETE FROM users");
    }

    @Test
    void publicApisFilterInactiveDataProjectFieldsAndOrderPhotos() throws Exception {
        Owner owner = owner("public");
        long active = service(owner.salonId(), "Cut", true);
        long inactive = service(owner.salonId(), "Hidden", false);
        long visibleStaff = staff(owner.salonId(), "Alice", true);
        staff(owner.salonId(), "Hidden Staff", false);
        jdbc.update("INSERT INTO staff_services (salon_id, staff_id, service_id) VALUES (?,?,?)",
            owner.salonId(), visibleStaff, active);
        jdbc.update("INSERT INTO staff_services (salon_id, staff_id, service_id) VALUES (?,?,?)",
            owner.salonId(), visibleStaff, inactive);
        jdbc.update("INSERT INTO salon_photos (salon_id, photo_url, alt_text, sort_order) VALUES (?,?,?,?)",
            owner.salonId(), "https://cdn.example.com/second.jpg", "Second", 2);
        jdbc.update("INSERT INTO salon_photos (salon_id, photo_url, alt_text, sort_order) VALUES (?,?,?,?)",
            owner.salonId(), "https://cdn.example.com/first.jpg", "First", 1);

        mockMvc.perform(get("/api/salon/profile").header("Host", owner.host()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("public Salon"))
            .andExpect(jsonPath("$.cancellationWindowMinutes").value(120))
            .andExpect(jsonPath("$.photos[0].sortOrder").value(1))
            .andExpect(jsonPath("$.photos[1].sortOrder").value(2))
            .andExpect(jsonPath("$.ownerId").doesNotExist())
            .andExpect(jsonPath("$.status").doesNotExist());
        mockMvc.perform(get("/api/salon/services").header("Host", owner.host()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Cut"))
            .andExpect(jsonPath("$[1]").doesNotExist())
            .andExpect(jsonPath("$[0].salonId").doesNotExist())
            .andExpect(jsonPath("$[0].active").doesNotExist());
        mockMvc.perform(get("/api/salon/staff").header("Host", owner.host()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Alice"))
            .andExpect(jsonPath("$[0].serviceIds[0]").value(active))
            .andExpect(jsonPath("$[0].serviceIds[1]").doesNotExist())
            .andExpect(jsonPath("$[1]").doesNotExist())
            .andExpect(jsonPath("$[0].salonId").doesNotExist());
    }

    @Test
    void dashboardRequiresAuthenticationChecksHostOwnershipAndHidesCrossTenantIds()
            throws Exception {
        Owner alpha = owner("alpha");
        Owner beta = owner("beta");
        long betaService = service(beta.salonId(), "Other", true);

        mockMvc.perform(get("/api/salon/dashboard/profile").header("Host", alpha.host()))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/salon/dashboard/profile").header("Host", alpha.host())
                .cookie(cookie(beta.token())))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error").value("FORBIDDEN"));
        mockMvc.perform(delete("/api/salon/dashboard/services/{id}", betaService)
                .header("Host", alpha.host()).cookie(cookie(alpha.token())))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error").value("SERVICE_NOT_FOUND"));
        assertThat(jdbc.queryForObject("SELECT is_active FROM services WHERE id=?",
            Boolean.class, betaService)).isTrue();

        mockMvc.perform(put("/api/salon/dashboard/profile").header("Host", alpha.host())
                .cookie(cookie(alpha.token())).contentType(MediaType.APPLICATION_JSON)
                .content(profileJson(" <b>Updated</b> ")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated"));
    }

    @Test
    void wrongOwnerIsForbiddenAcrossEveryDashboardRouteAndMethodFamily() throws Exception {
        Owner alpha = owner("route-owner-alpha");
        Owner beta = owner("route-owner-beta");
        long alphaService = service(alpha.salonId(), "Alpha Service", true);
        long alphaStaff = staff(alpha.salonId(), "Alpha Staff", true);
        long alphaTimeOff = timeOff(alpha.salonId(), alphaStaff,
            "2031-01-10T09:00:00", "2031-01-10T10:00:00");

        for (var request : List.of(
                get("/api/salon/dashboard/profile"),
                put("/api/salon/dashboard/profile")
                    .contentType(MediaType.APPLICATION_JSON).content(profileJson("Alpha")),
                get("/api/salon/dashboard/services"),
                post("/api/salon/dashboard/services")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(serviceJson("New Service", 30, "20.00")),
                put("/api/salon/dashboard/services/{id}", alphaService)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Updated Service\",\"durationMinutes\":45,"
                        + "\"price\":25.00,\"category\":\"Hair\",\"active\":true}"),
                delete("/api/salon/dashboard/services/{id}", alphaService),
                get("/api/salon/dashboard/staff"),
                post("/api/salon/dashboard/staff")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"New Staff\",\"photoUrl\":null}"),
                put("/api/salon/dashboard/staff/{id}", alphaStaff)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Updated Staff\",\"photoUrl\":null,"
                        + "\"active\":true}"),
                delete("/api/salon/dashboard/staff/{id}", alphaStaff),
                put("/api/salon/dashboard/staff/{id}/services", alphaStaff)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"serviceIds\":[" + alphaService + "]}"),
                put("/api/salon/dashboard/staff/{id}/working-hours", alphaStaff)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"workingHours\":[{\"dayOfWeek\":1,"
                        + "\"startTime\":\"09:00\",\"endTime\":\"17:00\"}]}"),
                get("/api/salon/dashboard/staff/{id}/time-off", alphaStaff),
                post("/api/salon/dashboard/staff/{id}/time-off", alphaStaff)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"startDateTime\":\"2031-02-10T09:00:00\","
                        + "\"endDateTime\":\"2031-02-10T10:00:00\",\"reason\":\"Away\"}"),
                delete("/api/salon/dashboard/staff/{id}/time-off/{timeOffId}",
                    alphaStaff, alphaTimeOff))) {
            mockMvc.perform(request.header("Host", alpha.host()).cookie(cookie(beta.token())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));
        }
    }

    @Test
    void timeOffRejectsStartAtOrAfterEndAndCrossSalonStaffAndTimeOffIds() throws Exception {
        Owner alpha = owner("timeoff-alpha");
        Owner beta = owner("timeoff-beta");
        long alphaStaff = staff(alpha.salonId(), "Alpha Staff", true);
        long betaStaff = staff(beta.salonId(), "Beta Staff", true);
        long betaTimeOff = timeOff(beta.salonId(), betaStaff,
            "2032-01-10T09:00:00", "2032-01-10T10:00:00");

        for (String invalid : List.of(
                "{\"startDateTime\":\"2032-02-10T10:00:00\","
                    + "\"endDateTime\":\"2032-02-10T10:00:00\",\"reason\":\"Equal\"}",
                "{\"startDateTime\":\"2032-02-10T11:00:00\","
                    + "\"endDateTime\":\"2032-02-10T10:00:00\",\"reason\":\"After\"}")) {
            mockMvc.perform(post("/api/salon/dashboard/staff/{id}/time-off", alphaStaff)
                    .header("Host", alpha.host()).cookie(cookie(alpha.token()))
                    .contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.timeOff").exists());
        }

        mockMvc.perform(get("/api/salon/dashboard/staff/{id}/time-off", betaStaff)
                .header("Host", alpha.host()).cookie(cookie(alpha.token())))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error").value("STAFF_NOT_FOUND"));
        mockMvc.perform(delete("/api/salon/dashboard/staff/{id}/time-off/{timeOffId}",
                alphaStaff, betaTimeOff)
                .header("Host", alpha.host()).cookie(cookie(alpha.token())))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error").value("TIME_OFF_NOT_FOUND"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM staff_time_off WHERE id=?",
            Integer.class, betaTimeOff)).isOne();
    }

    @Test
    void dashboardServiceCrudValidatesAndSoftDeletes() throws Exception {
        Owner owner = owner("services");
        mockMvc.perform(post("/api/salon/dashboard/services").header("Host", owner.host())
                .cookie(cookie(owner.token())).contentType(MediaType.APPLICATION_JSON)
                .content(serviceJson(" <b>Cut</b> ", 45, "25.50")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Cut"))
            .andExpect(jsonPath("$.active").value(true));
        long id = jdbc.queryForObject("SELECT id FROM services WHERE salon_id=?", Long.class,
            owner.salonId());
        mockMvc.perform(put("/api/salon/dashboard/services/{id}", id)
                .header("Host", owner.host()).cookie(cookie(owner.token()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Color\",\"durationMinutes\":60,\"price\":40.00,\"category\":\"Hair\",\"active\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Color"));
        mockMvc.perform(post("/api/salon/dashboard/services").header("Host", owner.host())
                .cookie(cookie(owner.token())).contentType(MediaType.APPLICATION_JSON)
                .content(serviceJson("Bad", 10, "-1")))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
        mockMvc.perform(delete("/api/salon/dashboard/services/{id}", id)
                .header("Host", owner.host()).cookie(cookie(owner.token())))
            .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/salon/dashboard/services").header("Host", owner.host())
                .cookie(cookie(owner.token())))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].active").value(false));
        mockMvc.perform(get("/api/salon/services").header("Host", owner.host()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0]").doesNotExist());
    }

    @Test
    void staffCrudAndAssignmentReplacementAreScopedAtomicAndActiveOnly() throws Exception {
        Owner owner = owner("staff");
        Owner other = owner("other");
        long first = service(owner.salonId(), "First", true);
        long inactive = service(owner.salonId(), "Inactive", false);
        long foreign = service(other.salonId(), "Foreign", true);
        mockMvc.perform(post("/api/salon/dashboard/staff").header("Host", owner.host())
                .cookie(cookie(owner.token())).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\" <i>Alice</i> \",\"photoUrl\":\"https://cdn.example.com/a.jpg\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Alice"));
        long staffId = jdbc.queryForObject("SELECT id FROM salon_staff WHERE salon_id=?",
            Long.class, owner.salonId());
        assign(owner, staffId, "[" + first + "]", status().isOk());
        assign(owner, staffId, "[" + first + "," + inactive + "]", status().isBadRequest());
        assign(owner, staffId, "[" + foreign + "]", status().isBadRequest());
        assertThat(jdbc.queryForList("SELECT service_id FROM staff_services WHERE salon_id=?",
            Long.class, owner.salonId())).containsExactly(first);
        mockMvc.perform(put("/api/salon/dashboard/staff/{id}", staffId)
                .header("Host", owner.host()).cookie(cookie(owner.token()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Alice B\",\"photoUrl\":null,\"active\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Alice B"));
        mockMvc.perform(delete("/api/salon/dashboard/staff/{id}", staffId)
                .header("Host", owner.host()).cookie(cookie(owner.token())))
            .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/salon/staff").header("Host", owner.host()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0]").doesNotExist());
    }

    @Test
    void weeklyHoursFullReplacementValidatesOverlapAndRollsBack() throws Exception {
        Owner owner = owner("hours");
        long staffId = staff(owner.salonId(), "Hours", true);
        String valid = "{\"workingHours\":["
            + "{\"dayOfWeek\":1,\"startTime\":\"09:00\",\"endTime\":\"12:00\"},"
            + "{\"dayOfWeek\":1,\"startTime\":\"13:00\",\"endTime\":\"17:00\"}]}";
        mockMvc.perform(put("/api/salon/dashboard/staff/{id}/working-hours", staffId)
                .header("Host", owner.host()).cookie(cookie(owner.token()))
                .contentType(MediaType.APPLICATION_JSON).content(valid))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].startTime").value("09:00:00"))
            .andExpect(jsonPath("$[1].startTime").value("13:00:00"));
        String overlap = "{\"workingHours\":["
            + "{\"dayOfWeek\":1,\"startTime\":\"08:00\",\"endTime\":\"11:00\"},"
            + "{\"dayOfWeek\":1,\"startTime\":\"10:00\",\"endTime\":\"12:00\"}]}";
        mockMvc.perform(put("/api/salon/dashboard/staff/{id}/working-hours", staffId)
                .header("Host", owner.host()).cookie(cookie(owner.token()))
                .contentType(MediaType.APPLICATION_JSON).content(overlap))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.workingHours").exists());
        assertThat(jdbc.queryForList("SELECT start_time FROM staff_working_hours "
            + "WHERE salon_id=? ORDER BY start_time", java.sql.Time.class, owner.salonId()))
            .hasSize(2);
    }

    @Test
    void timeOffCreateListDeleteRejectsInvalidAndOverlap() throws Exception {
        Owner owner = owner("timeoff");
        long staffId = staff(owner.salonId(), "Away", true);
        String entry = "{\"startDateTime\":\"2030-01-10T09:00:00\","
            + "\"endDateTime\":\"2030-01-10T12:00:00\",\"reason\":\" Holiday \"}";
        mockMvc.perform(post("/api/salon/dashboard/staff/{id}/time-off", staffId)
                .header("Host", owner.host()).cookie(cookie(owner.token()))
                .contentType(MediaType.APPLICATION_JSON).content(entry))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.reason").value("Holiday"));
        long id = jdbc.queryForObject("SELECT id FROM staff_time_off WHERE salon_id=?",
            Long.class, owner.salonId());
        String overlap = "{\"startDateTime\":\"2030-01-10T11:00:00\","
            + "\"endDateTime\":\"2030-01-10T13:00:00\",\"reason\":\"Overlap\"}";
        mockMvc.perform(post("/api/salon/dashboard/staff/{id}/time-off", staffId)
                .header("Host", owner.host()).cookie(cookie(owner.token()))
                .contentType(MediaType.APPLICATION_JSON).content(overlap))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.error").value("TIME_OFF_OVERLAP"));
        mockMvc.perform(get("/api/salon/dashboard/staff/{id}/time-off", staffId)
                .header("Host", owner.host()).cookie(cookie(owner.token())))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id));
        mockMvc.perform(delete("/api/salon/dashboard/staff/{id}/time-off/{timeOffId}", staffId, id)
                .header("Host", owner.host()).cookie(cookie(owner.token())))
            .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM staff_time_off", Integer.class)).isZero();
    }

    private Owner owner(String label) throws Exception {
        String subdomain = label + run;
        String email = subdomain + "@example.com";
        String token = signup(email);
        long ownerId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, email);
        jdbc.update("INSERT INTO salons (owner_id,subdomain,name,description,address,city,phone,email,logo_url,timezone,status,cancellation_window_minutes,created_at) "
            + "VALUES (?,?,?,'Description','1 Main','City','+1 555 0100',?,'https://cdn.example.com/logo.png','UTC','ACTIVE',120,CURRENT_TIMESTAMP)",
            ownerId, subdomain, label + " Salon", email);
        long salonId = jdbc.queryForObject("SELECT id FROM salons WHERE owner_id=?", Long.class,
            ownerId);
        return new Owner(token, salonId, subdomain + ".localhost");
    }

    private String signup(String email) {
        return testUsers.create(email, com.hairsaloon.auth.UserRole.SALON_OWNER).token();
    }

    private long service(long salonId, String name, boolean active) {
        jdbc.update("INSERT INTO services (salon_id,name,duration_minutes,price,category,is_active,created_at) "
            + "VALUES (?,?,30,20.00,'Hair',?,CURRENT_TIMESTAMP)", salonId, name, active);
        return jdbc.queryForObject("SELECT MAX(id) FROM services WHERE salon_id=?", Long.class,
            salonId);
    }

    private long staff(long salonId, String name, boolean active) {
        jdbc.update("INSERT INTO salon_staff (salon_id,name,photo_url,is_active,created_at) "
            + "VALUES (?,?,NULL,?,CURRENT_TIMESTAMP)", salonId, name, active);
        return jdbc.queryForObject("SELECT MAX(id) FROM salon_staff WHERE salon_id=?", Long.class,
            salonId);
    }

    private long timeOff(long salonId, long staffId, String start, String end) {
        jdbc.update("INSERT INTO staff_time_off "
                + "(salon_id,staff_id,start_datetime,end_datetime,reason,created_at) "
                + "VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)",
            salonId, staffId, start, end, "Seeded");
        return jdbc.queryForObject("SELECT MAX(id) FROM staff_time_off WHERE salon_id=?",
            Long.class, salonId);
    }

    private void assign(Owner owner, long staffId, String ids,
                        org.springframework.test.web.servlet.ResultMatcher expected) throws Exception {
        mockMvc.perform(put("/api/salon/dashboard/staff/{id}/services", staffId)
                .header("Host", owner.host()).cookie(cookie(owner.token()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"serviceIds\":" + ids + "}"))
            .andExpect(expected);
    }

    private static Cookie cookie(String token) { return new Cookie("auth_token", token); }
    private static String serviceJson(String name, int duration, String price) {
        return "{\"name\":\"" + name + "\",\"durationMinutes\":" + duration
            + ",\"price\":" + price + ",\"category\":\"Hair\"}";
    }
    private static String profileJson(String name) {
        return "{\"name\":\"" + name + "\",\"description\":\"Nice\","
            + "\"address\":\"2 Main\",\"city\":\"City\",\"phone\":\"+1 555 0100\","
            + "\"email\":\"SALON@EXAMPLE.COM\",\"logoUrl\":\"https://cdn.example.com/l.png\","
            + "\"timezone\":\"UTC\",\"cancellationWindowMinutes\":60}";
    }
    record Owner(String token, long salonId, String host) {}
}
