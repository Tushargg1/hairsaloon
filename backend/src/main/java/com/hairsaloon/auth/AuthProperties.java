package com.hairsaloon.auth;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public class AuthProperties {
    private final Jwt jwt = new Jwt();
    private final Cookie cookie = new Cookie();
    private final BootstrapPlatformAdmin bootstrapPlatformAdmin = new BootstrapPlatformAdmin();
    private final RateLimit rateLimit = new RateLimit();
    private final Otp otp = new Otp();
    private final Security security = new Security();

    public Jwt getJwt() { return jwt; }
    public Cookie getCookie() { return cookie; }
    public BootstrapPlatformAdmin getBootstrapPlatformAdmin() { return bootstrapPlatformAdmin; }
    public RateLimit getRateLimit() { return rateLimit; }
    public Otp getOtp() { return otp; }
    public Security getSecurity() { return security; }

    public static class Jwt {
        private String secret = "";
        private String issuer = "hairsaloon";
        private Duration ttl = Duration.ofHours(8);
        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
        public String getIssuer() { return issuer; }
        public void setIssuer(String issuer) { this.issuer = issuer; }
        public Duration getTtl() { return ttl; }
        public void setTtl(Duration ttl) { this.ttl = ttl; }
    }

    public static class Cookie {
        private String domain = ".yoursite.com";
        private boolean secure = true;
        public String getDomain() { return domain; }
        public void setDomain(String domain) { this.domain = domain; }
        public boolean isSecure() { return secure; }
        public void setSecure(boolean secure) { this.secure = secure; }
    }
    public static class BootstrapPlatformAdmin {
        private boolean enabled;
        private String email = "";
        private String password = "";
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class RateLimit {
        private int maxAttempts = 5;
        private Duration window = Duration.ofMinutes(5);
        private boolean redisEnabled = true;
        private String keyPrefix = "hairsaloon:auth:rate:";
        public int getMaxAttempts() { return maxAttempts; }
        public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
        public Duration getWindow() { return window; }
        public void setWindow(Duration window) { this.window = window; }
        public boolean isRedisEnabled() { return redisEnabled; }
        public void setRedisEnabled(boolean redisEnabled) { this.redisEnabled = redisEnabled; }
        public String getKeyPrefix() { return keyPrefix; }
        public void setKeyPrefix(String keyPrefix) { this.keyPrefix = keyPrefix; }
    }

    public static class Otp {
        private int codeLength = 6;
        private int maxAttempts = 5;
        private Duration challengeTtl = Duration.ofMinutes(10);
        private Duration proofTtl = Duration.ofMinutes(5);
        private Duration resendDelay = Duration.ofSeconds(60);
        private boolean allowCodeLogging;
        private boolean exposeCode;
        private boolean requireSignupVerification = true;
        public int getCodeLength() { return codeLength; }
        public void setCodeLength(int codeLength) { this.codeLength = codeLength; }
        public int getMaxAttempts() { return maxAttempts; }
        public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
        public Duration getChallengeTtl() { return challengeTtl; }
        public void setChallengeTtl(Duration challengeTtl) { this.challengeTtl = challengeTtl; }
        public Duration getProofTtl() { return proofTtl; }
        public void setProofTtl(Duration proofTtl) { this.proofTtl = proofTtl; }
        public Duration getResendDelay() { return resendDelay; }
        public void setResendDelay(Duration resendDelay) { this.resendDelay = resendDelay; }
        public boolean isAllowCodeLogging() { return allowCodeLogging; }
        public void setAllowCodeLogging(boolean allowCodeLogging) { this.allowCodeLogging = allowCodeLogging; }
        public boolean isExposeCode() { return exposeCode; }
        public void setExposeCode(boolean exposeCode) { this.exposeCode = exposeCode; }
        public boolean isRequireSignupVerification() { return requireSignupVerification; }
        public void setRequireSignupVerification(boolean requireSignupVerification) {
            this.requireSignupVerification = requireSignupVerification;
        }
    }

    public static class Security {
        private String hmacSecret = "";
        public String getHmacSecret() { return hmacSecret; }
        public void setHmacSecret(String hmacSecret) { this.hmacSecret = hmacSecret; }
    }
}
