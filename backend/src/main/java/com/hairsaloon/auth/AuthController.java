package com.hairsaloon.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/auth")
class AuthController {

    private final AuthService authService;
    private final AuthCookieService cookies;

    AuthController(AuthService authService, AuthCookieService cookies) {
        this.authService = authService;
        this.cookies = cookies;
    }

    @PostMapping("/signup")
    ResponseEntity<UserResponse> signup(@Valid @RequestBody SignupRequest request) {
        AuthService.AuthResult result = authService.signup(
            request.email(), request.password(), request.role());
        return ResponseEntity.status(HttpStatus.CREATED)
            .header(HttpHeaders.SET_COOKIE, cookies.authenticated(result.token()).toString())
            .body(UserResponse.from(result.user()));
    }

    @PostMapping("/login")
    ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.AuthResult result = authService.login(request.email(), request.password());
        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, cookies.authenticated(result.token()).toString())
            .body(UserResponse.from(result.user()));
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout() {
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, cookies.cleared().toString())
            .build();
    }

    @GetMapping("/me")
    UserResponse me(@AuthenticationPrincipal AuthenticatedUser user) {
        return UserResponse.from(user);
    }

    record SignupRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotNull UserRole role) {
        SignupRequest {
            email = email == null ? null : email.trim();
        }
    }

    record LoginRequest(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(min = 8, max = 72) String password) {
        LoginRequest {
            email = email == null ? null : email.trim();
        }
    }

    record UserResponse(Long id, String email, UserRole role) {
        static UserResponse from(AuthenticatedUser user) {
            return new UserResponse(user.id(), user.email(), user.role());
        }
    }
}
