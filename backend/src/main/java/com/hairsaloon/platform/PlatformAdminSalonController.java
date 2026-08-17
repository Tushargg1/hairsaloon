package com.hairsaloon.platform;

import com.hairsaloon.platform.SalonDtos.PendingSalonResponse;
import com.hairsaloon.platform.SalonDtos.SalonResponse;
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

    PlatformAdminSalonController(PlatformSalonService service) {
        this.service = service;
    }

    @GetMapping("/pending")
    List<PendingSalonResponse> pending() {
        return service.pending();
    }

    @PostMapping("/{id}/approve")
    SalonResponse approve(@PathVariable long id) {
        return service.approve(id);
    }
}
