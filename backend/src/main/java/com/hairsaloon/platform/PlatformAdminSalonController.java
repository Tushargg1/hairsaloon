package com.hairsaloon.platform;

import com.hairsaloon.auth.User;
import com.hairsaloon.auth.UserRepository;
import com.hairsaloon.platform.SalonDtos.PendingSalonResponse;
import com.hairsaloon.platform.SalonDtos.SalonResponse;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import com.hairsaloon.tenant.SalonStatus;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/platform/admin/salons")
class PlatformAdminSalonController {

    private final PlatformSalonService service;
    private final SalonRepository salons;
    private final UserRepository users;

    PlatformAdminSalonController(PlatformSalonService service, SalonRepository salons,
                                 UserRepository users) {
        this.service = service;
        this.salons = salons;
        this.users = users;
    }

    @GetMapping("/pending")
    List<PendingSalonResponse> pending() {
        return service.pending();
    }

    @PostMapping("/{id}/approve")
    SalonResponse approve(@PathVariable long id) {
        return service.approve(id);
    }

    @PostMapping("/{id}/activate")
    SalonResponse activate(@PathVariable long id) {
        return service.activate(id);
    }

    @PostMapping("/{id}/suspend")
    SalonResponse suspend(@PathVariable long id) {
        return service.suspend(id);
    }

    @GetMapping
    List<AdminSalonView> allSalons() {
        List<Salon> all = salons.findAll();
        Map<Long, User> owners = users.findAllById(
                all.stream().map(Salon::getOwnerId).filter(java.util.Objects::nonNull).toList())
            .stream().collect(Collectors.toMap(User::getId, Function.identity(), (a, b) -> a));
        Instant now = Instant.now();
        return all.stream()
            .map(s -> AdminSalonView.from(s, owners.get(s.getOwnerId()), now))
            .toList();
    }

    /** Admin sets/extends a salon's paid membership expiry (null clears it). */
    @PutMapping("/{id}/membership")
    void membership(@PathVariable long id, @Valid @RequestBody MembershipRequest request) {
        Salon salon = salons.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Salon not found"));
        salon.setMembershipExpiresAt(request.expiresAt());
        salons.save(salon);
    }

    record MembershipRequest(Instant expiresAt) {}

    /**
     * Registration email/phone come from the owner account (what they signed up with);
     * category buckets the salon for the admin sub-tabs.
     */
    record AdminSalonView(Long id, String subdomain, String name, String city,
                          String phone, String email, String ownerEmail, String ownerPhone,
                          String status, boolean trial, String membershipExpiresAt,
                          String category, String createdAt) {
        static AdminSalonView from(Salon s, User owner, Instant now) {
            Instant expiry = s.getMembershipExpiresAt();
            String category;
            if (s.isTrial()) {
                category = "TRIAL";
            } else if (s.getStatus() == SalonStatus.SUSPENDED) {
                category = "DEACTIVATED";
            } else if (s.getStatus() == SalonStatus.PENDING) {
                category = "PENDING";
            } else if (expiry != null && expiry.isBefore(now)) {
                category = "PENDING_PAYMENT";
            } else {
                category = "ACTIVE";
            }
            return new AdminSalonView(s.getId(), s.getSubdomain(), s.getName(), s.getCity(),
                s.getPhone(), s.getEmail(),
                owner != null ? owner.getEmail() : null,
                owner != null ? owner.getPhone() : null,
                s.getStatus().name(), s.isTrial(),
                expiry != null ? expiry.toString() : null,
                category,
                s.getCreatedAt() != null ? s.getCreatedAt().toString() : null);
        }
    }
}
