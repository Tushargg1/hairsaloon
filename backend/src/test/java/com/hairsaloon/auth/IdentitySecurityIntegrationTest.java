package com.hairsaloon.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:identity;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.data.redis.repositories.enabled=false", "app.platform-hosts=localhost",
    "app.auth.jwt.secret=raw:0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-extra-secret",
    "app.auth.jwt.issuer=identity-test", "app.auth.cookie.domain=",
    "app.auth.cookie.secure=false", "app.auth.rate-limit.redis-enabled=false",
    "app.auth.otp.require-signup-verification=false",
    "app.auth.bootstrap-platform-admin.enabled=false"
})
@AutoConfigureMockMvc
class IdentitySecurityIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @Autowired TestUserFactory testUsers;
    @Autowired LoginRateLimiter rateLimiter;

    @BeforeEach
    void clean() {
        users.deleteAll();
        rateLimiter.clear();
    }

    @Test
    void privilegedLoginAcceptsOnlyOwnerOrAdminByNormalizedEmail() throws Exception {
        testUsers.create("owner@example.com", UserRole.SALON_OWNER);
        testUsers.create("admin@example.com", UserRole.PLATFORM_ADMIN);
        testUsers.create("customer@example.com", UserRole.CUSTOMER);

        mockMvc.perform(post("/api/platform/privileged-auth/login").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content(login(" OWNER@EXAMPLE.COM ")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("SALON_OWNER"))
            .andExpect(header().string(HttpHeaders.SET_COOKIE,
                org.hamcrest.Matchers.containsString("auth_token=")));

        mockMvc.perform(post("/api/platform/privileged-auth/login").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON).content(login("admin@example.com")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("PLATFORM_ADMIN"));

        mockMvc.perform(post("/api/platform/privileged-auth/login").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON).content(login("customer@example.com")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"));
    }

    @Test
    void onlyPlatformAdminCanProvisionExplicitOwnerWithoutReturningPassword() throws Exception {
        TestUserFactory.Identity admin = testUsers.create("admin2@example.com",
            UserRole.PLATFORM_ADMIN);
        TestUserFactory.Identity customer = testUsers.create("customer2@example.com",
            UserRole.CUSTOMER);
        String body = "{\"name\":\"Morgan Owner\",\"phone\":\"9876543999\","
            + "\"email\":\"New.Owner@Example.com\","
            + "\"temporaryPassword\":\"Temporary123!\"}";

        mockMvc.perform(post("/api/platform/admin/owners").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/platform/admin/owners").header("Host", "localhost")
                .cookie(new Cookie("auth_token", customer.token()))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/platform/admin/owners").header("Host", "localhost")
                .cookie(new Cookie("auth_token", admin.token()))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Morgan Owner"))
            .andExpect(jsonPath("$.email").value("new.owner@example.com"))
            .andExpect(jsonPath("$.role").value("SALON_OWNER"))
            .andExpect(jsonPath("$.temporaryPassword").doesNotExist())
            .andExpect(jsonPath("$.passwordHash").doesNotExist());

        User owner = users.findByEmailIgnoreCase("new.owner@example.com").orElseThrow();
        assertThat(owner.getRole()).isEqualTo(UserRole.SALON_OWNER);
        assertThat(owner.getPhoneVerifiedAt()).isNotNull();

        mockMvc.perform(post("/api/platform/admin/owners").header("Host", "localhost")
                .cookie(new Cookie("auth_token", admin.token()))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("PHONE_EXISTS"));
    }

    private static String login(String email) {
        return "{\"email\":\"" + email + "\",\"password\":\"Password123!\"}";
    }
}
