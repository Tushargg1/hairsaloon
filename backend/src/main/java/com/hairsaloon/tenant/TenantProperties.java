package com.hairsaloon.tenant;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class TenantProperties {

    private String baseDomain = "localhost";
    private List<String> platformHosts = new ArrayList<>(List.of("localhost", "www.localhost"));
    private Duration tenantCacheTtl = Duration.ofMinutes(5);

    public String getBaseDomain() {
        return baseDomain;
    }

    public void setBaseDomain(String baseDomain) {
        this.baseDomain = baseDomain;
    }

    public List<String> getPlatformHosts() {
        return platformHosts;
    }

    public void setPlatformHosts(List<String> platformHosts) {
        this.platformHosts = platformHosts;
    }

    public Duration getTenantCacheTtl() {
        return tenantCacheTtl;
    }

    public void setTenantCacheTtl(Duration tenantCacheTtl) {
        this.tenantCacheTtl = tenantCacheTtl;
    }
}
