package com.hairsaloon.whatsapp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hairsaloon.auth.AuthenticatedUser;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Owner dashboard actions for connecting/managing the salon's WhatsApp bot. */
@RestController
@RequestMapping("/api/salon/dashboard/whatsapp")
class WhatsappDashboardController {

    private final WhatsappService service;

    WhatsappDashboardController(WhatsappService service) {
        this.service = service;
    }

    @GetMapping
    WhatsappService.Status status(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.status(user);
    }

    @PostMapping("/connect")
    WhatsappService.Status connect(@AuthenticationPrincipal AuthenticatedUser user,
                                   @Valid @RequestBody ConnectRequest request) {
        return service.connect(user, request.code(), request.wabaId());
    }

    @PostMapping("/disconnect")
    WhatsappService.Status disconnect(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.disconnect(user);
    }

    @PostMapping("/bot")
    WhatsappService.Status bot(@AuthenticationPrincipal AuthenticatedUser user,
                               @Valid @RequestBody BotRequest request) {
        return service.setBotEnabled(user, Boolean.TRUE.equals(request.enabled()));
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record ConnectRequest(@NotBlank @Size(max = 512) String code,
                          @NotBlank @Size(max = 64) String wabaId) {}

    @JsonIgnoreProperties(ignoreUnknown = false)
    record BotRequest(@NotNull Boolean enabled) {}
}
