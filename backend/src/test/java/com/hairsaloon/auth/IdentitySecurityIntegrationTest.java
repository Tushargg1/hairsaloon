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

    @Test
    void businessSignupCreatesOwnerThatCanUsePrivilegedLoginButNotCustomerLogin()
            throws Exception {
        String body = businessSignup("Priya Owner", "9811100011", "Priya@Salon.com");

        mockMvc.perform(post("/api/platform/auth/business-signup").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.role").value("SALON_OWNER"))
            .andExpect(jsonPath("$.name").value("Priya Owner"))
            .andExpect(jsonPath("$.email").value("priya@salon.com"))
            .andExpect(jsonPath("$.passwordHash").doesNotExist())
            .andExpect(header().string(HttpHeaders.SET_COOKIE,
                org.hamcrest.Matchers.containsString("auth_token=")));

        User owner = users.findByEmailIgnoreCase("priya@salon.com").orElseThrow();
        assertThat(owner.getRole()).isEqualTo(UserRole.SALON_OWNER);

        // Owners authenticate by email; the customer phone login must not accept them.
        mockMvc.perform(post("/api/platform/auth/login").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"9811100011\",\"password\":\"Password123!\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"));

        mockMvc.perform(post("/api/platform/privileged-auth/login").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON).content(login("priya@salon.com")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("SALON_OWNER"));
    }

    @Test
    void businessSignupRequiresEmailAndRejectsDuplicateIdentifiers() throws Exception {
        // Email is mandatory because it is the owner's login identifier.
        mockMvc.perform(post("/api/platform/auth/business-signup").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"No Email\",\"phone\":\"9811100022\","
                    + "\"password\":\"Password123!\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.fieldErrors.email").exists());

        mockMvc.perform(post("/api/platform/auth/business-signup").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content(businessSignup("First Owner", "9811100033", "first@salon.com")))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/platform/auth/business-signup").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content(businessSignup("Same Phone", "9811100033", "other@salon.com")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("PHONE_EXISTS"));

        mockMvc.perform(post("/api/platform/auth/business-signup").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content(businessSignup("Same Email", "9811100044", "FIRST@salon.com")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error").value("EMAIL_EXISTS"));
    }

    @Test
    void businessSignupCannotSelfAssignPlatformAdmin() throws Exception {
        // The role is assigned server-side, so a caller-supplied "role" cannot escalate.
        mockMvc.perform(post("/api/platform/auth/business-signup").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Escalate\",\"phone\":\"9811100055\","
                    + "\"email\":\"escalate@salon.com\",\"password\":\"Password123!\","
                    + "\"role\":\"PLATFORM_ADMIN\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.role").value("SALON_OWNER"));

        assertThat(users.findByEmailIgnoreCase("escalate@salon.com").orElseThrow().getRole())
            .isEqualTo(UserRole.SALON_OWNER);
    }

    private static String businessSignup(String name, String phone, String email) {
        return "{\"name\":\"" + name + "\",\"phone\":\"" + phone + "\",\"email\":\"" + email
            + "\",\"password\":\"Password123!\"}";
    }

    private static String login(String email) {
        return "{\"email\":\"" + email + "\",\"password\":\"Password123!\"}";
    }
}
