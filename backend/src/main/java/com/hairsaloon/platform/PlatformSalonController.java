package com.hairsaloon.platform;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.platform.SalonDtos.PageResponse;
import com.hairsaloon.platform.SalonDtos.SalonResponse;
import com.hairsaloon.platform.SalonDtos.SubdomainResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/salons")
class PlatformSalonController {

    private final PlatformSalonService service;

    PlatformSalonController(PlatformSalonService service) {
        this.service = service;
    }

    @GetMapping
    PageResponse<SalonResponse> directory(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String service,
            @RequestParam(required = false) String rating,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String page,
            @RequestParam(required = false) String size,
            @RequestParam(required = false) String latitude,
            @RequestParam(required = false) String longitude,
            @RequestParam(required = false) String radiusKm) {
        return this.service.directory(city, service, rating, search, page, size,
            latitude, longitude, radiusKm);
    }

    @GetMapping("/check-subdomain")
    SubdomainResponse checkSubdomain(@RequestParam(required = false) String name) {
        return service.checkSubdomain(name);
    }

    @GetMapping("/mine")
    SalonResponse mine(@AuthenticationPrincipal AuthenticatedUser owner) {
        return service.mine(owner);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    SalonResponse create(@AuthenticationPrincipal AuthenticatedUser owner,
                         @Valid @RequestBody CreateSalonRequest request) {
        return service.create(owner, request.subdomain(), request.name(), request.description(),
            request.address(), request.city(), request.phone(), request.email(),
            request.logoUrl(), request.timezone(), request.latitude(), request.longitude());
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record CreateSalonRequest(
        @NotBlank @Size(max = 30) String subdomain,
        @NotBlank @Size(max = 160) String name,
        @Size(max = 5000) String description,
        @NotBlank @Size(max = 500) String address,
        @NotBlank @Size(max = 120) String city,
        @Size(max = 32) String phone,
        @Size(max = 320) String email,
        @Size(max = 2048) String logoUrl,
        @NotBlank @Size(max = 64) String timezone,
        BigDecimal latitude,
        BigDecimal longitude) {

        @JsonAnySetter
        void rejectUnknownProperty(String property, Object value) {
            throw new IllegalArgumentException("Unknown field: " + property);
        }
    }
}
