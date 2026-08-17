package com.hairsaloon.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/platform/profile")
class ProfileController {

    private final UserRepository users;

    ProfileController(UserRepository users) {
        this.users = users;
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

    record UpdateProfileRequest(
        @Size(max = 160) String name,
        @NotBlank @Size(min = 10, max = 15) String phone,
        @Email @Size(max = 320) String email) {}

    record ProfileResponse(Long id, String name, String phone, String email) {}
}
