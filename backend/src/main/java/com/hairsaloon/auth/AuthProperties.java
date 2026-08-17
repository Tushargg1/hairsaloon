package com.hairsaloon.auth;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public class AuthProperties {

    private final Jwt jwt = new Jwt();
    private final Cookie cookie = new Cookie();
    private final BootstrapPlatformAdmin bootstrapPlatformAdmin =
        new BootstrapPlatformAdmin();

    public Jwt getJwt() {
        return jwt;
    }

    public Cookie getCookie() {
        return cookie;
    }

    public BootstrapPlatformAdmin getBootstrapPlatformAdmin() {
        return bootstrapPlatformAdmin;
    }

    public static class Jwt {
        private String secret = "";
        private String issuer = "hairsaloon";
        private Duration ttl = Duration.ofHours(8);

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }

        public Duration getTtl() {
            return ttl;
        }

        public void setTtl(Duration ttl) {
            this.ttl = ttl;
        }
    }

    public static class Cookie {
        private String domain = ".yoursite.com";
        private boolean secure = true;

        public String getDomain() {
            return domain;
        }

        public void setDomain(String domain) {
            this.domain = domain;
        }

        public boolean isSecure() {
            return secure;
        }

        public void setSecure(boolean secure) {
            this.secure = secure;
        }
    }

    public static class BootstrapPlatformAdmin {
        private boolean enabled;
        private String email = "";
        private String password = "";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }
}
