package com.hairsaloon.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/profile")
class ProfileController {

    private final AuthService authService;

    ProfileController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping
    AuthService.ProfileView getProfile(@AuthenticationPrincipal AuthenticatedUser principal) {
        return authService.profile(principal.id());
    }

    @PutMapping
    AuthService.ProfileView updateProfile(@AuthenticationPrincipal AuthenticatedUser principal,
                                         @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(principal.id(), request.name(), request.phone(),
            request.email());
    }

    @PutMapping("/password")
    ResponseEntity<Void> changePassword(@AuthenticationPrincipal AuthenticatedUser principal,
                                        @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(principal.id(), request.currentPassword(),
            request.newPassword());
        return ResponseEntity.noContent().build();
    }

    record UpdateProfileRequest(
        @Size(max = 160) String name,
        @NotBlank @Size(min = 10, max = 15) String phone,
        @Email @Size(max = 320) String email) {
        UpdateProfileRequest {
            name = name == null ? null : name.trim();
            phone = phone == null ? null : phone.trim();
            email = email == null || email.isBlank() ? null : email.trim();
        }
    }

    record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, max = 72) String newPassword) {}
}
