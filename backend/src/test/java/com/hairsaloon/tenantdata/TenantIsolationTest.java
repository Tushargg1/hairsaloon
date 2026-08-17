package com.hairsaloon.tenantdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.hairsaloon.tenant.TenantContext;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;

@DataJpaTest(properties = {
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(SalonPhotoService.class)
class TenantIsolationTest {

    @Autowired TestEntityManager entityManager;
    @Autowired SalonPhotoService service;

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void salonADataIsInvisibleWhileSalonBContextIsActive() {
        entityManager.persist(new SalonPhoto(1001L, "https://cdn/a.jpg", 0));
        entityManager.persist(new SalonPhoto(2002L, "https://cdn/b.jpg", 0));
        entityManager.flush();
        entityManager.clear();

        TenantContext.setSalonId(2002L);
        List<SalonPhoto> visible = service.findAllForCurrentTenant();

        assertThat(visible).extracting(SalonPhoto::getPhotoUrl)
            .containsExactly("https://cdn/b.jpg")
            .doesNotContain("https://cdn/a.jpg");

        TenantContext.clear();
        assertThatThrownBy(service::findAllForCurrentTenant)
            .isInstanceOf(IllegalStateException.class);
    }
}
