package com.hairsaloon.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
    "app.auth.cookie.domain=.yoursite.com",
    "app.auth.cookie.secure=true",
    "app.auth.bootstrap-platform-admin.enabled=false"
})
@AutoConfigureMockMvc
class AuthIntegrationTest {

    private static final String HOST = "localhost";

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;

    @BeforeEach
    void clearUsers() {
        users.deleteAll();
    }

    @Test
    void signupValidatesFieldsAndRejectsPlatformAdmin() throws Exception {
        mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"bad\",\"password\":\"short\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.fieldErrors.email").exists())
            .andExpect(jsonPath("$.fieldErrors.password").exists())
            .andExpect(jsonPath("$.fieldErrors.role").exists());

        mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson("admin@example.com", "Password123!", "PLATFORM_ADMIN")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("INVALID_ROLE"));
    }

    @Test
    void signupAcceptsCustomerAndSalonOwnerAndNormalizesDuplicateEmail() throws Exception {
        mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson(" Customer@Example.COM ", "Password123!", "CUSTOMER")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").value("customer@example.com"))
            .andExpect(jsonPath("$.role").value("CUSTOMER"))
            .andExpect(jsonPath("$.passwordHash").doesNotExist())
            .andExpect(jsonPath("$.token").doesNotExist());

        mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson("owner@example.com", "Password123!", "SALON_OWNER")))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.role").value("SALON_OWNER"));

        mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson("CUSTOMER@example.com", "Password123!", "CUSTOMER")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("EMAIL_EXISTS"));
    }

    @Test
    void loginSetsHardenedCookieAndBadCredentialsAreUnauthorized() throws Exception {
        signup("cookie@example.com", "Password123!", "CUSTOMER");

        MvcResult login = mockMvc.perform(post("/api/platform/auth/login").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("COOKIE@EXAMPLE.COM", "Password123!")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.passwordHash").doesNotExist())
            .andReturn();

        String setCookie = login.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie)
            .contains("auth_token=")
            .contains("Domain=.yoursite.com")
            .contains("Path=/")
            .contains("Max-Age=7200")
            .contains("Secure")
            .contains("HttpOnly")
            .contains("SameSite=Lax");

        mockMvc.perform(post("/api/platform/auth/login").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("cookie@example.com", "WrongPassword!")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"));
    }

    @Test
    void meUsesOnlyValidCookieAndReturnsSanitizedUser() throws Exception {
        String token = signup("me@example.com", "Password123!", "CUSTOMER");

        mockMvc.perform(get("/api/platform/auth/me").header("Host", HOST)
                .cookie(new Cookie("auth_token", token)))
            .andExpect(status().isOk())
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
        String token = signup("roles@example.com", "Password123!", "CUSTOMER");

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
    void logoutClearsCookieWithMatchingAttributes() throws Exception {
        mockMvc.perform(post("/api/platform/auth/logout").header("Host", HOST))
            .andExpect(status().isNoContent())
            .andExpect(header().string(HttpHeaders.SET_COOKIE,
                org.hamcrest.Matchers.allOf(
                    org.hamcrest.Matchers.containsString("auth_token="),
                    org.hamcrest.Matchers.containsString("Domain=.yoursite.com"),
                    org.hamcrest.Matchers.containsString("Path=/"),
                    org.hamcrest.Matchers.containsString("Max-Age=0"),
                    org.hamcrest.Matchers.containsString("Secure"),
                    org.hamcrest.Matchers.containsString("HttpOnly"),
                    org.hamcrest.Matchers.containsString("SameSite=Lax"))));
    }

    private String signup(String email, String password, String role) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/platform/auth/signup").header("Host", HOST)
                .contentType(MediaType.APPLICATION_JSON)
                .content(signupJson(email, password, role)))
            .andExpect(status().isCreated())
            .andReturn();
        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).isNotNull();
        return setCookie.substring("auth_token=".length(), setCookie.indexOf(';'));
    }

    private static String signupJson(String email, String password, String role) {
        return """
            {"email":"%s","password":"%s","role":"%s"}
            """.formatted(email, password, role);
    }

    private static String loginJson(String email, String password) {
        return """
            {"email":"%s","password":"%s"}
            """.formatted(email, password);
    }
}
