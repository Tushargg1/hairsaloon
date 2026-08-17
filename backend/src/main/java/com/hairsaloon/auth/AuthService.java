package com.hairsaloon.auth;

import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    AuthResult signup(String email, String password, UserRole role) {
        if (role == UserRole.PLATFORM_ADMIN) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "INVALID_ROLE",
                "Public signup supports only CUSTOMER or SALON_OWNER");
        }
        String normalizedEmail = normalize(email);
        if (users.existsByEmail(normalizedEmail)) {
            throw duplicateEmail();
        }
        try {
            User user = users.saveAndFlush(new User(normalizedEmail,
                passwordEncoder.encode(password), role));
            return result(user);
        } catch (DataIntegrityViolationException duplicate) {
            throw duplicateEmail();
        }
    }

    @Transactional(readOnly = true)
    AuthResult login(String email, String password) {
        User user = users.findByEmail(normalize(email))
            .orElseThrow(AuthService::invalidCredentials);
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return result(user);
    }

    private AuthResult result(User user) {
        return new AuthResult(new AuthenticatedUser(
            user.getId(), user.getEmail(), user.getRole()), jwtService.issue(user));
    }

    static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static AuthException duplicateEmail() {
        return new AuthException(HttpStatus.CONFLICT, "EMAIL_EXISTS",
            "An account with this email already exists");
    }

    private static AuthException invalidCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
            "Invalid email or password");
    }

    record AuthResult(AuthenticatedUser user, String token) {
    }
}
