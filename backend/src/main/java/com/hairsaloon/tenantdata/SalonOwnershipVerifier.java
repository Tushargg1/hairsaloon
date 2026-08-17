package com.hairsaloon.tenantdata;

import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.platform.PlatformApiException;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import com.hairsaloon.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SalonOwnershipVerifier {
    private final SalonRepository salons;

    SalonOwnershipVerifier(SalonRepository salons) {
        this.salons = salons;
    }

    @Transactional(readOnly = true)
    public Salon verifyOwner(AuthenticatedUser user) {
        long salonId = TenantContext.requireSalonId();
        Salon salon = salons.findById(salonId).orElseThrow(() ->
            new PlatformApiException(HttpStatus.NOT_FOUND, "SALON_NOT_FOUND",
                "Salon was not found"));
        if (user == null || !salon.getOwnerId().equals(user.id())) {
            throw new PlatformApiException(HttpStatus.FORBIDDEN, "FORBIDDEN",
                "You do not own the current salon");
        }
        return salon;
    }
}
