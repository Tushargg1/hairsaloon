package com.hairsaloon.platform;

import com.hairsaloon.platform.SalonDtos.PendingSalonResponse;
import com.hairsaloon.platform.SalonDtos.SalonResponse;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/admin/salons")
class PlatformAdminSalonController {

    private final PlatformSalonService service;
    private final SalonRepository salons;

    PlatformAdminSalonController(PlatformSalonService service, SalonRepository salons) {
        this.service = service;
        this.salons = salons;
    }

    @GetMapping("/pending")
    List<PendingSalonResponse> pending() {
        return service.pending();
    }

    @PostMapping("/{id}/approve")
    SalonResponse approve(@PathVariable long id) {
        return service.approve(id);
    }

    @GetMapping
    List<AdminSalonView> allSalons() {
        return salons.findAll().stream().map(AdminSalonView::from).toList();
    }

    record AdminSalonView(Long id, String subdomain, String name, String city,
                          String phone, String email, String status, String createdAt) {
        static AdminSalonView from(Salon s) {
            return new AdminSalonView(s.getId(), s.getSubdomain(), s.getName(), s.getCity(),
                s.getPhone(), s.getEmail(), s.getStatus().name(),
                s.getCreatedAt() != null ? s.getCreatedAt().toString() : null);
        }
    }
}
