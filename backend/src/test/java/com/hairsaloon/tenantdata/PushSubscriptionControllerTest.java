package com.hairsaloon.tenantdata;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.auth.UserRole;
import com.hairsaloon.notification.PushSubscriptionAudience;
import com.hairsaloon.notification.PushSubscriptionService;
import com.hairsaloon.platform.PlatformApiException;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class PushSubscriptionControllerTest {
    private static final String ENDPOINT = "https://push.example/device";
    private static final String P256DH = "A".repeat(87);
    private static final String AUTH = "B".repeat(22);
    private final PushSubscriptionService subscriptions = mock(PushSubscriptionService.class);
    private final SalonOwnershipVerifier ownership = mock(SalonOwnershipVerifier.class);
    private final PushSubscriptionController controller =
        new PushSubscriptionController(subscriptions, ownership);

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void customerSubscriptionUsesAuthenticatedUserAndActiveTenant() {
        TenantContext.setSalonId(31L);
        AuthenticatedUser customer = user(7L, UserRole.CUSTOMER);

        controller.subscribeCustomer(customer, request());
        controller.unsubscribeCustomer(customer,
            new PushSubscriptionController.UnsubscribeRequest(ENDPOINT));

        verify(subscriptions).subscribe(31L, 7L, PushSubscriptionAudience.CUSTOMER,
            ENDPOINT, P256DH, AUTH);
        verify(subscriptions).unsubscribe(31L, 7L, PushSubscriptionAudience.CUSTOMER,
            ENDPOINT);
    }

    @Test
    void ownerSubscriptionRequiresOwnershipAndUsesVerifiedSalon() {
        AuthenticatedUser owner = user(9L, UserRole.SALON_OWNER);
        Salon salon = mock(Salon.class);
        when(salon.getId()).thenReturn(44L);
        when(ownership.verifyOwner(owner)).thenReturn(salon);

        controller.subscribeOwner(owner, request());

        verify(ownership).verifyOwner(owner);
        verify(subscriptions).subscribe(44L, 9L, PushSubscriptionAudience.OWNER,
            ENDPOINT, P256DH, AUTH);
    }

    @Test
    void customerRouteRejectsAnonymousAndOwnerPrincipals() {
        TenantContext.setSalonId(31L);

        assertThatThrownBy(() -> controller.subscribeCustomer(null, request()))
            .isInstanceOfSatisfying(PlatformApiException.class,
                failure -> org.assertj.core.api.Assertions.assertThat(failure.status().value())
                    .isEqualTo(401));
        assertThatThrownBy(() -> controller.subscribeCustomer(
                user(9L, UserRole.SALON_OWNER), request()))
            .isInstanceOfSatisfying(PlatformApiException.class,
                failure -> org.assertj.core.api.Assertions.assertThat(failure.status().value())
                    .isEqualTo(403));
        verifyNoInteractions(subscriptions);
    }

    private static PushSubscriptionController.SubscriptionRequest request() {
        return new PushSubscriptionController.SubscriptionRequest(ENDPOINT,
            new PushSubscriptionController.Keys(P256DH, AUTH));
    }

    private static AuthenticatedUser user(long id, UserRole role) {
        return new AuthenticatedUser(id, "User", "+15550000000", "user@example.com", role);
    }
}
