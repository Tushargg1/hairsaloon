package com.hairsaloon.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hairsaloon.web.ApiErrorWriter;
import jakarta.servlet.ServletException;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

@ExtendWith(MockitoExtension.class)
class TenantResolutionFilterTest {

    @Mock
    private TenantResolver resolver;

    private TenantResolutionFilter filter;

    @BeforeEach
    void setUp() {
        TenantProperties properties = new TenantProperties();
        properties.setBaseDomain("yoursite.com");
        properties.setPlatformHosts(List.of("yoursite.com", "www.yoursite.com", "api.yoursite.com"));
        filter = new TenantResolutionFilter(resolver,
            new ApiErrorWriter(new ObjectMapper()), request -> null, properties);
    }

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    @Test
    void resolvesSubdomainWithOptionalPortAndAlwaysClearsContext() throws Exception {
        when(resolver.resolveActiveSalonId("glamour")).thenReturn(Optional.of(17L));
        MockHttpServletRequest request = requestWithHost("Glamour.YourSite.com:8443");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (req, res) ->
            assertThat(TenantContext.requireSalonId()).isEqualTo(17L));

        assertThat(TenantContext.getSalonId()).isEmpty();
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void configuredPlatformHostHasNoTenant() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(requestWithHost("api.yoursite.com:443"), response, (req, res) ->
            assertThat(TenantContext.getSalonId()).isEmpty());

        verifyNoInteractions(resolver);
        assertThat(TenantContext.getSalonId()).isEmpty();
    }

    @Test
    void healthProbeBypassesTenantResolutionForInfrastructureHost() throws Exception {
        MockHttpServletRequest request = requestWithHost("10.0.1.42:8080");
        request.setRequestURI("/actuator/health/readiness");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (req, res) ->
            assertThat(TenantContext.getSalonId()).isEmpty());

        verifyNoInteractions(resolver);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void unknownInactiveOrMalformedTenantHostReturnsNotFoundAndClears() throws Exception {
        when(resolver.resolveActiveSalonId("missing")).thenReturn(Optional.empty());
        MockHttpServletResponse missing = new MockHttpServletResponse();
        filter.doFilter(requestWithHost("missing.yoursite.com"), missing,
            (req, res) -> { throw new AssertionError("chain must not run"); });
        assertThat(missing.getStatus()).isEqualTo(404);
        assertThat(TenantContext.getSalonId()).isEmpty();

        MockHttpServletResponse malformed = new MockHttpServletResponse();
        filter.doFilter(requestWithHost("nested.glamour.yoursite.com"), malformed,
            (req, res) -> { throw new AssertionError("chain must not run"); });
        assertThat(malformed.getStatus()).isEqualTo(404);
        assertThat(TenantContext.getSalonId()).isEmpty();
    }

    @Test
    void contextIsClearedEvenWhenDownstreamThrows() {
        when(resolver.resolveActiveSalonId("glamour")).thenReturn(Optional.of(17L));
        MockHttpServletResponse response = new MockHttpServletResponse();

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            filter.doFilter(requestWithHost("glamour.yoursite.com"), response,
                (req, res) -> { throw new ServletException("failed downstream"); }))
            .isInstanceOf(ServletException.class);
        assertThat(TenantContext.getSalonId()).isEmpty();
    }

    private static MockHttpServletRequest requestWithHost(String host) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", host);
        return request;
    }
}
