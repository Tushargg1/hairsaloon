package com.hairsaloon.tenantdata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.auth.UserRole;
import com.hairsaloon.notification.PushSubscriptionAudience;
import com.hairsaloon.notification.PushSubscriptionService;
import com.hairsaloon.platform.PlatformApiException;
import com.hairsaloon.tenant.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class PushSubscriptionController {
    private final PushSubscriptionService subscriptions;
    private final SalonOwnershipVerifier ownership;

    PushSubscriptionController(PushSubscriptionService subscriptions,
            SalonOwnershipVerifier ownership) {
        this.subscriptions = subscriptions;
        this.ownership = ownership;
    }

    @PostMapping("/api/salon/push-subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void subscribeCustomer(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody SubscriptionRequest request) {
        requireCustomer(user);
        subscribe(TenantContext.requireSalonId(), user.id(),
            PushSubscriptionAudience.CUSTOMER, request);
    }

    @DeleteMapping("/api/salon/push-subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unsubscribeCustomer(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody UnsubscribeRequest request) {
        requireCustomer(user);
        unsubscribe(TenantContext.requireSalonId(), user.id(),
            PushSubscriptionAudience.CUSTOMER, request.endpoint());
    }

    @PostMapping("/api/salon/dashboard/push-subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void subscribeOwner(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody SubscriptionRequest request) {
        long salonId = ownership.verifyOwner(user).getId();
        subscribe(salonId, user.id(), PushSubscriptionAudience.OWNER, request);
    }

    @DeleteMapping("/api/salon/dashboard/push-subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void unsubscribeOwner(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody UnsubscribeRequest request) {
        long salonId = ownership.verifyOwner(user).getId();
        unsubscribe(salonId, user.id(), PushSubscriptionAudience.OWNER, request.endpoint());
    }

    private void subscribe(long salonId, long userId, PushSubscriptionAudience audience,
            SubscriptionRequest request) {
        try {
            subscriptions.subscribe(salonId, userId, audience, request.endpoint(),
                request.keys().p256dh(), request.keys().auth());
        } catch (IllegalArgumentException invalid) {
            throw TenantInputPolicy.validation("subscription", invalid.getMessage());
        }
    }

    private void unsubscribe(long salonId, long userId, PushSubscriptionAudience audience,
            String endpoint) {
        try {
            subscriptions.unsubscribe(salonId, userId, audience, endpoint);
        } catch (IllegalArgumentException invalid) {
            throw TenantInputPolicy.validation("endpoint", invalid.getMessage());
        }
    }

    private static void requireCustomer(AuthenticatedUser user) {
        if (user == null)
            throw new PlatformApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                "Authentication is required");
        if (user.role() != UserRole.CUSTOMER)
            throw new PlatformApiException(HttpStatus.FORBIDDEN, "FORBIDDEN",
                "Customer access is required");
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record SubscriptionRequest(@NotBlank @Size(max = 2048) String endpoint,
                               @NotNull @Valid Keys keys) {}
    @JsonIgnoreProperties(ignoreUnknown = false)
    record Keys(@NotBlank @Size(min = 43, max = 512) String p256dh,
                @NotBlank @Size(min = 16, max = 255) String auth) {}
    @JsonIgnoreProperties(ignoreUnknown = false)
    record UnsubscribeRequest(@NotBlank @Size(max = 2048) String endpoint) {}
}
