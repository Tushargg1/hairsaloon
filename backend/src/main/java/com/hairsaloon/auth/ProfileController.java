package com.hairsaloon.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/platform/profile")
class ProfileController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    ProfileController(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    ProfileResponse getProfile(@AuthenticationPrincipal AuthenticatedUser principal) {
        User user = users.findById(principal.id()).orElseThrow();
        return new ProfileResponse(user.getId(), user.getName(), user.getPhone(), user.getEmail());
    }

    @PutMapping
    ResponseEntity<ProfileResponse> updateProfile(@AuthenticationPrincipal AuthenticatedUser principal,
                                                   @Valid @RequestBody UpdateProfileRequest request) {
        User user = users.findById(principal.id()).orElseThrow();
        user.setName(request.name());
        if (request.email() != null && !request.email().isBlank()) {
            user.setEmail(request.email().trim().toLowerCase(java.util.Locale.ROOT));
        } else {
            user.setEmail(null);
        }
        if (request.phone() != null && !request.phone().isBlank()) {
            user.setPhone(request.phone().trim());
        }
        users.save(user);
        return ResponseEntity.ok(new ProfileResponse(user.getId(), user.getName(), user.getPhone(), user.getEmail()));
    }

    @PutMapping("/password")
    ResponseEntity<Void> changePassword(@AuthenticationPrincipal AuthenticatedUser principal,
                                         @Valid @RequestBody ChangePasswordRequest request) {
        User user = users.findById(principal.id()).orElseThrow();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD",
                "Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        users.save(user);
        return ResponseEntity.noContent().build();
    }

    record UpdateProfileRequest(
        @Size(max = 160) String name,
        @NotBlank @Size(min = 10, max = 15) String phone,
        @Email @Size(max = 320) String email) {}

    record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, max = 72) String newPassword) {}

    record ProfileResponse(Long id, String name, String phone, String email) {}
}
