package com.hairsaloon.auth;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Locale;
import java.util.Set;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
class PlatformAdminBootstrap implements ApplicationRunner {

    private final AuthProperties properties;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final Validator validator;

    PlatformAdminBootstrap(AuthProperties properties, UserRepository users,
                           PasswordEncoder passwordEncoder, Validator validator) {
        this.properties = properties;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.validator = validator;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        AuthProperties.BootstrapPlatformAdmin config =
            properties.getBootstrapPlatformAdmin();
        if (!config.isEnabled()) {
            return;
        }
        Credentials credentials = new Credentials(config.getEmail(), config.getPassword());
        Set<ConstraintViolation<Credentials>> violations = validator.validate(credentials);
        if (!violations.isEmpty()) {
            throw new IllegalStateException("Invalid platform admin bootstrap credentials");
        }
        String email = config.getEmail().trim().toLowerCase(Locale.ROOT);
        users.findByEmail(email).ifPresentOrElse(existing -> {
            if (existing.getRole() != UserRole.PLATFORM_ADMIN) {
                throw new IllegalStateException("Bootstrap email belongs to a non-admin user");
            }
        }, () -> users.save(new User(email, passwordEncoder.encode(config.getPassword()),
            UserRole.PLATFORM_ADMIN)));
    }


    private record Credentials(
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(min = 8, max = 72) String password) {
    }
}
