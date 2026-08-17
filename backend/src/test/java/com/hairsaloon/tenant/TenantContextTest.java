package com.hairsaloon.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class TenantContextTest {

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    @Test
    void getRequireSetAndClearAreSafe() {
        assertThat(TenantContext.getSalonId()).isEmpty();
        assertThatThrownBy(TenantContext::requireSalonId)
            .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> TenantContext.setSalonId(0))
            .isInstanceOf(IllegalArgumentException.class);

        TenantContext.setSalonId(41L);
        TenantContext.setSalonId(41L);
        assertThat(TenantContext.requireSalonId()).isEqualTo(41L);
        assertThatThrownBy(() -> TenantContext.setSalonId(42L))
            .isInstanceOf(IllegalStateException.class);

        TenantContext.clear();
        assertThat(TenantContext.getSalonId()).isEmpty();
    }
}
