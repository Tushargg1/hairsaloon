package com.hairsaloon.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/admin/owners")
class OwnerProvisioningController {
    private final AuthService authService;

    OwnerProvisioningController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AuthController.UserResponse create(@Valid @RequestBody CreateOwnerRequest request) {
        return AuthController.UserResponse.from(authService.provisionOwner(request.name(),
            request.phone(), request.email(), request.temporaryPassword()));
    }

    record CreateOwnerRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Size(min = 10, max = 15) String phone,
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(min = 12, max = 72) String temporaryPassword) {
        CreateOwnerRequest {
            name = name == null ? null : name.trim();
            phone = phone == null ? null : phone.trim();
            email = email == null ? null : email.trim();
        }
    }
}
