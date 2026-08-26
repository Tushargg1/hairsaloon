package com.hairsaloon.config;

import com.hairsaloon.web.ApiErrorWriter;
import com.hairsaloon.auth.AuthProperties;
import com.hairsaloon.auth.JwtAuthenticationFilter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableConfigurationProperties(AuthProperties.class)
public class SecurityConfiguration {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter,
                                            CsrfOriginFilter csrfOriginFilter,
                                            ApiErrorWriter errors) throws Exception {
        return http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(requests -> requests
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers("/api/platform/auth/signup",
                    "/api/platform/auth/business-signup", "/api/platform/auth/login",
                    "/api/platform/auth/logout", "/api/platform/auth/otp/**",
                    "/api/platform/privileged-auth/login").permitAll()
                .requestMatchers("/api/platform/auth/me").authenticated()
                .requestMatchers("/api/platform/profile", "/api/platform/profile/**")
                    .hasRole("CUSTOMER")
                .requestMatchers("/api/platform/favorites", "/api/platform/favorites/**")
                    .hasRole("CUSTOMER")
                .requestMatchers("/api/platform/my-bookings").hasRole("CUSTOMER")
                .requestMatchers("/api/platform/admin/**").hasRole("PLATFORM_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/platform/salons/check-subdomain",
                    "/api/platform/salons/mine")
                    .hasRole("SALON_OWNER")
                .requestMatchers(HttpMethod.POST, "/api/platform/salons")
                    .hasRole("SALON_OWNER")
                .requestMatchers(HttpMethod.GET, "/api/platform/salons").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/salon/media").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/salon/push-subscriptions",
                    "/api/salon/promotions/validate").hasRole("CUSTOMER")
                .requestMatchers(HttpMethod.DELETE, "/api/salon/push-subscriptions")
                    .hasRole("CUSTOMER")
                .requestMatchers("/api/salon/dashboard/**").hasRole("SALON_OWNER")
                .requestMatchers(HttpMethod.GET, "/api/salon/reviews").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/salon/reviews")
                    .hasRole("CUSTOMER")
                .requestMatchers("/api/salon/bookings", "/api/salon/bookings/**")
                    .hasRole("CUSTOMER")
                // Remaining public reads, enumerated so the default can stay closed.
                .requestMatchers(HttpMethod.GET, "/api/salon/profile", "/api/salon/services",
                    "/api/salon/staff", "/api/salon/availability", "/api/salon/promotions")
                    .permitAll()
                // Fail closed: a new endpoint is denied until it is listed above.
                .anyRequest().denyAll())
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, exception) ->
                    errors.unauthorized(response))
                .accessDeniedHandler((request, response, exception) ->
                    errors.forbidden(response)))
            .requestCache(cache -> cache.disable())
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .logout(logout -> logout.disable())
            .addFilterBefore(csrfOriginFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
