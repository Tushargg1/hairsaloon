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
    AuthResult signup(String phone, String email, String password) {
        String normalizedPhone = phone.trim();
        String normalizedEmail = email == null || email.isBlank() ? null : normalize(email);
        if (users.existsByPhone(normalizedPhone)) {
            throw new AuthException(HttpStatus.CONFLICT, "PHONE_EXISTS",
                "An account with this phone number already exists");
        }
        if (normalizedEmail != null && users.existsByEmail(normalizedEmail)) {
            throw duplicateEmail();
        }
        try {
            User user = users.saveAndFlush(new User(normalizedPhone, normalizedEmail,
                passwordEncoder.encode(password), UserRole.CUSTOMER));
            return result(user);
        } catch (DataIntegrityViolationException duplicate) {
            throw new AuthException(HttpStatus.CONFLICT, "PHONE_EXISTS",
                "An account with this phone number already exists");
        }
    }

    @Transactional(readOnly = true)
    AuthResult login(String phone, String password) {
        User user = users.findByPhone(phone.trim())
            .orElseThrow(AuthService::invalidCredentials);
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return result(user);
    }

    private AuthResult result(User user) {
        return new AuthResult(new AuthenticatedUser(
            user.getId(), user.getPhone(), user.getEmail(), user.getRole()), jwtService.issue(user));
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
