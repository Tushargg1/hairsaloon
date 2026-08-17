package com.hairsaloon.tenant;

import java.util.Optional;

public final class TenantContext {

    private static final ThreadLocal<Long> CURRENT_SALON = new ThreadLocal<>();

    private TenantContext() {
    }

    public static Optional<Long> getSalonId() {
        return Optional.ofNullable(CURRENT_SALON.get());
    }

    public static long requireSalonId() {
        Long salonId = CURRENT_SALON.get();
        if (salonId == null) {
            throw new IllegalStateException("No tenant is active for the current request");
        }
        return salonId;
    }

    public static void setSalonId(long salonId) {
        if (salonId <= 0) {
            throw new IllegalArgumentException("salonId must be positive");
        }
        Long existing = CURRENT_SALON.get();
        if (existing != null && existing != salonId) {
            throw new IllegalStateException("Cannot replace an active tenant context");
        }
        CURRENT_SALON.set(salonId);
    }

    public static void clear() {
        CURRENT_SALON.remove();
    }
}
