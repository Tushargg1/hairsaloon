package com.hairsaloon.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:auth;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.data.redis.repositories.enabled=false",
    "app.platform-hosts=localhost",
    "app.auth.jwt.secret=raw:0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-extra-secret",
    "app.auth.jwt.issuer=auth-integration-test",
    "app.auth.jwt.ttl=2h",
    "app.auth.cookie.domain=",
    "app.auth.cookie.secure=false",
    "app.auth.rate-limit.redis-enabled=false",
    "app.auth.otp.require-signup-verification=false",
    "app.auth.bootstrap-platform-admin.enabled=false"
})
@AutoConfigureMockMvc
class AuthIntegrationTest {

    private static final String HOST = "localhost";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @Autowired LoginRateLimiter rateLimiter;
    @Autowired TestUserFactory testUsers;

    @BeforeEach
    void clearUsers() {
        users.deleteAll();
        rateLimiter.clear();
    }

    @Test
    void signupValidatesPhoneEmailPasswordAndCannotElevateRole() throws Exception {
        mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"bad\",\"email\":\"bad\",\"password\":\"short\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.fieldErrors.phone").exists())
            .andExpect(jsonPath("$.fieldErrors.email").exists())
            .andExpect(jsonPath("$.fieldErrors.password").exists());

        mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"9876543210\",\"password\":\"Password123!\","
                    + "\"role\":\"SALON_OWNER\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.role").value("CUSTOMER"));
    }

    @Test
    void signupCreatesOnlyCustomersAndSupportsOptionalEmailAndStableDuplicates() throws Exception {
        mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson("9876543210", " Customer@Example.COM ", "Password123!")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.phone").value("9876543210"))
            .andExpect(jsonPath("$.email").value("customer@example.com"))
            .andExpect(jsonPath("$.role").value("CUSTOMER"))
            .andExpect(jsonPath("$.passwordHash").doesNotExist())
            .andExpect(jsonPath("$.token").doesNotExist());

        mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson("9876543211", null, "Password123!")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").doesNotExist())
            .andExpect(jsonPath("$.role").value("CUSTOMER"));

        mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson("9876543210", "other@example.com", "Password123!")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("PHONE_EXISTS"));

        mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson("9876543212", "CUSTOMER@example.com", "Password123!")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("EMAIL_EXISTS"));
    }

    @Test
    void loginUsesPhoneSetsHostOnlyCookieAndRejectsNonCustomers() throws Exception {
        signup("9876543220", "cookie@example.com", "Password123!");

        MvcResult login = mockMvc.perform(post("/api/platform/auth/login").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("9876543220", "Password123!")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.phone").value("9876543220"))
            .andExpect(jsonPath("$.passwordHash").doesNotExist())
            .andReturn();

        String setCookie = login.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie)
            .contains("auth_token=")
            .doesNotContain("Domain=")
            .contains("Path=/")
            .contains("Max-Age=7200")
            .doesNotContain("Secure")
            .contains("HttpOnly")
            .contains("SameSite=Lax");

        mockMvc.perform(post("/api/platform/auth/login").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("9876543220", "WrongPassword!")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"));

        TestUserFactory.Identity owner = testUsers.create(
            "owner@example.com", UserRole.SALON_OWNER);
        mockMvc.perform(post("/api/platform/auth/login").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(owner.phone(), "Password123!")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"));
    }

    @Test
    void meUsesOnlyValidCookieAndReturnsSanitizedUser() throws Exception {
        String token = signup("9876543230", "me@example.com", "Password123!");

        mockMvc.perform(get("/api/platform/auth/me").header("Host", HOST)
                .cookie(new Cookie("auth_token", token)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.phone").value("9876543230"))
            .andExpect(jsonPath("$.email").value("me@example.com"))
            .andExpect(jsonPath("$.role").value("CUSTOMER"))
            .andExpect(jsonPath("$.passwordHash").doesNotExist())
            .andExpect(jsonPath("$.token").doesNotExist());

        mockMvc.perform(get("/api/platform/auth/me").header("Host", HOST))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));

        mockMvc.perform(get("/api/platform/auth/me").header("Host", HOST)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
            .andExpect(status().isUnauthorized());

        String tampered = token.substring(0, token.length() / 2) + "x"
            + token.substring(token.length() / 2 + 1);
        mockMvc.perform(get("/api/platform/auth/me").header("Host", HOST)
                .cookie(new Cookie("auth_token", tampered)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
    }

    @Test
    void deletedUserTokenIsRejectedAndCustomerGetsStableAdminForbidden() throws Exception {
        String token = signup("9876543240", "roles@example.com", "Password123!");

        mockMvc.perform(get("/api/platform/admin/probe").header("Host", HOST)
                .cookie(new Cookie("auth_token", token)))
            .andExpect(status().isForbidden())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.error").value("FORBIDDEN"));

        users.deleteAll();
        mockMvc.perform(get("/api/platform/auth/me").header("Host", HOST)
                .cookie(new Cookie("auth_token", token)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutClearsHostOnlyCookieWithMatchingAttributes() throws Exception {
        mockMvc.perform(post("/api/platform/auth/logout").header("Host", HOST))
            .andExpect(status().isNoContent())
            .andExpect(header().string(HttpHeaders.SET_COOKIE,
                org.hamcrest.Matchers.allOf(
                    org.hamcrest.Matchers.containsString("auth_token="),
                    org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Domain=")),
                    org.hamcrest.Matchers.containsString("Path=/"),
                    org.hamcrest.Matchers.containsString("Max-Age=0"),
                    org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Secure")),
                    org.hamcrest.Matchers.containsString("HttpOnly"),
                    org.hamcrest.Matchers.containsString("SameSite=Lax"))));
    }

    @Test
    void profileUpdateRefreshesSessionFieldsAndRejectsDuplicates() throws Exception {
        String token = signup("9876543250", "profile@example.com", "Password123!");
        signup("9876543251", "taken@example.com", "Password123!");

        mockMvc.perform(put("/api/platform/profile").header("Host", HOST)
                .cookie(new Cookie("auth_token", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"  Taylor  \",\"phone\":\"9876543252\","
                    + "\"email\":\" Updated@Example.COM \"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Taylor"))
            .andExpect(jsonPath("$.phone").value("9876543252"))
            .andExpect(jsonPath("$.email").value("updated@example.com"));

        mockMvc.perform(get("/api/platform/auth/me").header("Host", HOST)
                .cookie(new Cookie("auth_token", token)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Taylor"))
            .andExpect(jsonPath("$.phone").value("9876543252"))
            .andExpect(jsonPath("$.email").value("updated@example.com"));

        mockMvc.perform(put("/api/platform/profile").header("Host", HOST)
                .cookie(new Cookie("auth_token", token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Taylor\",\"phone\":\"9876543251\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("PHONE_EXISTS"));
    }

    @Test
    void loginRateLimitReturnsRetryAfter() throws Exception {
        String request = loginJson("9999999999", "WrongPassword!");
        for (int attempt = 0; attempt < 5; attempt++) {
            mockMvc.perform(post("/api/platform/auth/login").header("Host", HOST)
                    .with(http -> { http.setRemoteAddr("203.0.113.10"); return http; })
                    .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/platform/auth/login").header("Host", HOST)
                .with(http -> { http.setRemoteAddr("203.0.113.10"); return http; })
                .contentType(MediaType.APPLICATION_JSON).content(request))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().string(HttpHeaders.RETRY_AFTER,
                org.hamcrest.Matchers.matchesPattern("[1-9][0-9]*")))
            .andExpect(jsonPath("$.error").value("RATE_LIMITED"));
    }

    private String signup(String phone, String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson(phone, email, password)))
            .andExpect(status().isCreated())
            .andReturn();
        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).isNotNull();
        return setCookie.substring("auth_token=".length(), setCookie.indexOf(';'));
    }

    private static String signupJson(String phone, String email, String password) {
        String emailField = email == null ? "" : ",\"email\":\"" + email + "\"";
        return "{\"phone\":\"" + phone + "\"" + emailField
            + ",\"password\":\"" + password + "\"}";
    }

    private static String loginJson(String phone, String password) {
        return "{\"phone\":\"" + phone + "\",\"password\":\"" + password + "\"}";
    }
}
