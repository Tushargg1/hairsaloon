package com.hairsaloon.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:otp;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.data.redis.repositories.enabled=false", "app.platform-hosts=localhost",
    "app.auth.jwt.secret=raw:0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-extra-secret",
    "app.auth.jwt.issuer=otp-test", "app.auth.cookie.domain=",
    "app.auth.cookie.secure=false", "app.auth.rate-limit.redis-enabled=false",
    "app.auth.rate-limit.max-attempts=20", "app.auth.otp.max-attempts=3",
    "app.auth.otp.resend-delay=1ms", "app.auth.otp.expose-code=true",
    "app.auth.otp.allow-code-logging=false",
    "app.auth.otp.require-signup-verification=true",
    "app.auth.bootstrap-platform-admin.enabled=false"
})
@AutoConfigureMockMvc
class OtpIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired AuthChallengeRepository challenges;
    @Autowired TestUserFactory testUsers;
    @Autowired LoginRateLimiter rateLimiter;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void clean() {
        challenges.deleteAll();
        users.deleteAll();
        rateLimiter.clear();
    }

    @Test
    void signupRequiresMatchingShortLivedOneTimeProofAndMarksPhoneVerified() throws Exception {
        String phone = "9876543100";
        mockMvc.perform(post("/api/platform/auth/signup").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content(signup(phone, null)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VERIFICATION_PROOF_INVALID"));

        JsonNode challenge = request(phone, "SIGNUP");
        String proof = verify(challenge);
        mockMvc.perform(post("/api/platform/auth/signup").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON).content(signup(phone, proof)))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("CUSTOMER"));
        org.assertj.core.api.Assertions.assertThat(
            users.findByPhone(phone).orElseThrow().getPhoneVerifiedAt()).isNotNull();

        users.deleteAll();
        mockMvc.perform(post("/api/platform/auth/signup").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON).content(signup(phone, proof)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VERIFICATION_PROOF_INVALID"));
    }

    @Test
    void otpEnforcesAttemptsAndExpiry() throws Exception {
        JsonNode attempts = request("9876543101", "SIGNUP");
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/platform/auth/otp/verify").header("Host", "localhost")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(verifyJson(attempts.get("challengeId").asText(), "0000")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("OTP_INVALID"));
        }
        mockMvc.perform(post("/api/platform/auth/otp/verify").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson(attempts.get("challengeId").asText(), "0000")))
            .andExpect(status().isTooManyRequests())
            .andExpect(jsonPath("$.error").value("OTP_ATTEMPTS_EXCEEDED"));

        JsonNode expired = request("9876543102", "SIGNUP");
        jdbc.update("UPDATE auth_challenges SET expires_at = ? WHERE challenge_hash = ?",
            Instant.now().minusSeconds(1), challenges.findAll().stream()
                .filter(c -> c.getAttempts() == 0).findFirst().orElseThrow().getChallengeHash());
        mockMvc.perform(post("/api/platform/auth/otp/verify").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson(expired.get("challengeId").asText(), expired.get("code").asText())))
            .andExpect(status().isGone())
            .andExpect(jsonPath("$.error").value("OTP_EXPIRED"));
    }

    @Test
    void passwordResetIsEnumerationSafeAndRequiresUnconsumedProof() throws Exception {
        testUsers.create("reset@example.com", UserRole.CUSTOMER);
        User customer = users.findByEmailIgnoreCase("reset@example.com").orElseThrow();

        mockMvc.perform(post("/api/platform/auth/otp/request").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"9999999999\",\"purpose\":\"PASSWORD_RESET\"}"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.challengeId").isString())
            .andExpect(jsonPath("$.code").doesNotExist());

        JsonNode challenge = request(customer.getPhone(), "PASSWORD_RESET");
        String proof = verify(challenge);
        String reset = "{\"phone\":\"" + customer.getPhone()
            + "\",\"newPassword\":\"NewPassword123!\",\"verificationProof\":\""
            + proof + "\"}";
        mockMvc.perform(post("/api/platform/auth/otp/reset-password").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON).content(reset))
            .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/platform/auth/login").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"" + customer.getPhone()
                    + "\",\"password\":\"NewPassword123!\"}"))
            .andExpect(status().isOk());
        mockMvc.perform(post("/api/platform/auth/otp/reset-password").header("Host", "localhost")
                .contentType(MediaType.APPLICATION_JSON).content(reset))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("VERIFICATION_PROOF_INVALID"));
    }

    private JsonNode request(String phone, String purpose) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/platform/auth/otp/request")
                .header("Host", "localhost").contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"" + phone + "\",\"purpose\":\"" + purpose + "\"}"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.challengeId").isString())
            .andExpect(jsonPath("$.code").isString()).andReturn();
        return json.readTree(result.getResponse().getContentAsString());
    }

    private String verify(JsonNode challenge) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/platform/auth/otp/verify")
                .header("Host", "localhost").contentType(MediaType.APPLICATION_JSON)
                .content(verifyJson(challenge.get("challengeId").asText(),
                    challenge.get("code").asText())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verificationProof").isString()).andReturn();
        return json.readTree(result.getResponse().getContentAsString())
            .get("verificationProof").asText();
    }

    private static String verifyJson(String challengeId, String code) {
        return "{\"challengeId\":\"" + challengeId + "\",\"code\":\"" + code + "\"}";
    }

    private static String signup(String phone, String proof) {
        String proofField = proof == null ? "" : ",\"verificationProof\":\"" + proof + "\"";
        return "{\"phone\":\"" + phone + "\",\"email\":\"otp@example.com\","
            + "\"password\":\"Password123!\"" + proofField + "}";
    }
}
