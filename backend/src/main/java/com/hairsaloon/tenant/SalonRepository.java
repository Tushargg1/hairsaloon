package com.hairsaloon.tenant;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalonRepository extends JpaRepository<Salon, Long> {

    @Query("select salon.id from Salon salon where salon.subdomain = :subdomain and salon.status = :status")
    Optional<Long> findIdBySubdomainAndStatus(
        @Param("subdomain") String subdomain,
        @Param("status") SalonStatus status
    );

    @Query("select salon.id from Salon salon where salon.subdomain = :subdomain")
    Optional<Long> findIdBySubdomain(@Param("subdomain") String subdomain);

    boolean existsBySubdomain(String subdomain);

    boolean existsByOwnerId(Long ownerId);

    Optional<Salon> findByOwnerId(Long ownerId);

    // Inbound WhatsApp webhooks are keyed by phone_number_id; this maps one to its salon.
    Optional<Salon> findByWhatsappPhoneNumberId(String whatsappPhoneNumberId);
}
