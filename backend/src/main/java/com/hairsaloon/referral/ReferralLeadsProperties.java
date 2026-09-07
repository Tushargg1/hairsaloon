package com.hairsaloon.referral;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.referral-leads")
public record ReferralLeadsProperties(
    String apiUrl,
    String apiKey,
    Integer dailyLimit,
    Integer batchSize,
    Integer dailyOnboardTarget,
    Integer maxFailDays
) {

    public boolean enabled() {
        return apiUrl != null && !apiUrl.isBlank();
    }

    public int dailyLimitOr() { return dailyLimit != null && dailyLimit > 0 ? dailyLimit : 30; }
    public int batchSizeOr() { return batchSize != null && batchSize > 0 ? batchSize : 10; }
    public int onboardTargetOr() { return dailyOnboardTarget != null && dailyOnboardTarget > 0 ? dailyOnboardTarget : 3; }
    public int maxFailDaysOr() { return maxFailDays != null && maxFailDays > 0 ? maxFailDays : 3; }
}
