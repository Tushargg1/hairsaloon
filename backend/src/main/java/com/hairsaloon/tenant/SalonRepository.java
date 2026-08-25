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

    boolean existsBySubdomain(String subdomain);

    boolean existsByOwnerId(Long ownerId);

    Optional<Salon> findByOwnerId(Long ownerId);
}
