package com.hairsaloon.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
class LoggingSmsGateway implements SmsGateway {
    private static final Logger LOG = LoggerFactory.getLogger(LoggingSmsGateway.class);
    private final AuthProperties properties;

    LoggingSmsGateway(AuthProperties properties) {
        this.properties = properties;
    }

    @Override
    public void sendVerificationCode(String phone, String code, String purpose) {
        String maskedPhone = phone.length() <= 4 ? "****"
            : "*".repeat(phone.length() - 4) + phone.substring(phone.length() - 4);
        if (properties.getOtp().isAllowCodeLogging()) {
            LOG.warn("Development SMS OTP for {} purpose {}: {}", maskedPhone, purpose, code);
        } else {
            LOG.info("Development SMS gateway received {} message for {} (code logging disabled)",
                purpose, maskedPhone);
        }
    }
}
