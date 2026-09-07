package com.hairsaloon.referral;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(ReferralLeadsProperties.class)
class ReferralConfiguration {
}
