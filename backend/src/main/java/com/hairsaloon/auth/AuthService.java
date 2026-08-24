package com.hairsaloon.auth;

import java.time.Instant;
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
    private final OtpService otpService;
    private final AuthProperties properties;

    AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService,
                OtpService otpService, AuthProperties properties) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.otpService = otpService;
        this.properties = properties;
    }

    @Transactional
    AuthResult signup(String phone, String email, String password, String verificationProof) {
        String normalizedPhone = normalizePhone(phone);
        String normalizedEmail = normalizeNullableEmail(email);
        if (users.existsByPhone(normalizedPhone)) throw duplicatePhone();
        if (normalizedEmail != null && users.existsByEmailIgnoreCase(normalizedEmail)) {
            throw duplicateEmail();
        }
        Instant verifiedAt = null;
        if (properties.getOtp().isRequireSignupVerification()) {
            verifiedAt = otpService.consumeProof(verificationProof, normalizedPhone,
                AuthChallengePurpose.SIGNUP);
        }
        try {
            User user = new User(normalizedPhone, normalizedEmail,
                passwordEncoder.encode(password), UserRole.CUSTOMER);
            if (verifiedAt != null) user.markPhoneVerified(verifiedAt);
            return result(users.saveAndFlush(user));
        } catch (DataIntegrityViolationException duplicate) {
            if (normalizedEmail != null && users.existsByEmailIgnoreCase(normalizedEmail)) {
                throw duplicateEmail();
            }
            throw duplicatePhone();
        }
    }

    /**
     * Self-service registration for salon owners. Unlike customer signup, an email is
     * mandatory because owners authenticate with email at the privileged-login endpoint.
     * The account is created immediately; the salon they register still requires
     * platform-admin approval before it becomes publicly visible.
     */
    @Transactional
    AuthResult businessSignup(String name, String phone, String email, String password,
                              String verificationProof) {
        String normalizedPhone = normalizePhone(phone);
        String normalizedEmail = normalize(email);
        if (users.existsByPhone(normalizedPhone)) throw duplicatePhone();
        if (users.existsByEmailIgnoreCase(normalizedEmail)) throw duplicateEmail();
        Instant verifiedAt = null;
        if (properties.getOtp().isRequireSignupVerification()) {
            verifiedAt = otpService.consumeProof(verificationProof, normalizedPhone,
                AuthChallengePurpose.SIGNUP);
        }
        try {
            User owner = new User(normalizedPhone, normalizedEmail,
                passwordEncoder.encode(password), UserRole.SALON_OWNER);
            owner.setName(name.trim());
            if (verifiedAt != null) owner.markPhoneVerified(verifiedAt);
            return result(users.saveAndFlush(owner));
        } catch (DataIntegrityViolationException duplicate) {
            if (users.existsByEmailIgnoreCase(normalizedEmail)) throw duplicateEmail();
            throw duplicatePhone();
        }
    }

    @Transactional(readOnly = true)
    AuthResult customerLogin(String phone, String password) {
        User user = users.findByPhone(normalizePhone(phone))
            .filter(candidate -> candidate.getRole() == UserRole.CUSTOMER)
            .orElseThrow(AuthService::invalidCustomerCredentials);
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw invalidCustomerCredentials();
        }
        return result(user);
    }

    @Transactional(readOnly = true)
    AuthResult privilegedLogin(String email, String password) {
        User user = users.findByEmailIgnoreCase(normalize(email))
            .filter(candidate -> candidate.getRole() == UserRole.SALON_OWNER
                || candidate.getRole() == UserRole.PLATFORM_ADMIN)
            .orElseThrow(AuthService::invalidPrivilegedCredentials);
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw invalidPrivilegedCredentials();
        }
        return result(user);
    }

    @Transactional
    AuthenticatedUser provisionOwner(String name, String phone, String email,
                                     String temporaryPassword) {
        String normalizedPhone = normalizePhone(phone);
        String normalizedEmail = normalize(email);
        if (users.existsByPhone(normalizedPhone)) throw duplicatePhone();
        if (users.existsByEmailIgnoreCase(normalizedEmail)) throw duplicateEmail();
        try {
            User owner = new User(normalizedPhone, normalizedEmail,
                passwordEncoder.encode(temporaryPassword), UserRole.SALON_OWNER);
            owner.setName(name.trim());
            owner.markPhoneVerified(Instant.now());
            return principal(users.saveAndFlush(owner));
        } catch (DataIntegrityViolationException duplicate) {
            if (users.existsByEmailIgnoreCase(normalizedEmail)) throw duplicateEmail();
            throw duplicatePhone();
        }
    }

    @Transactional
    void resetPassword(String phone, String newPassword, String verificationProof) {
        String normalizedPhone = normalizePhone(phone);
        otpService.consumeProof(verificationProof, normalizedPhone,
            AuthChallengePurpose.PASSWORD_RESET);
        User user = users.findByPhone(normalizedPhone)
            .filter(candidate -> candidate.getRole() == UserRole.CUSTOMER)
            .orElseThrow(AuthService::invalidProof);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.markPhoneVerified(Instant.now());
        users.save(user);
    }

    @Transactional(readOnly = true)
    ProfileView profile(long userId) {
        return view(users.findById(userId).orElseThrow(AuthService::userNotFound));
    }

    /**
     * The uniqueness checks and the update must share one transaction; otherwise two
     * concurrent requests can both pass the check before either writes.
     */
    @Transactional
    ProfileView updateProfile(long userId, String name, String phone, String email) {
        User user = users.findById(userId).orElseThrow(AuthService::userNotFound);
        String normalizedPhone = normalizePhone(phone);
        String normalizedEmail = normalizeNullableEmail(email);
        if (users.existsByPhoneAndIdNot(normalizedPhone, user.getId())) throw duplicatePhone();
        if (normalizedEmail != null
                && users.existsByEmailAndIdNot(normalizedEmail, user.getId())) {
            throw duplicateEmail();
        }
        String trimmedName = name == null || name.isBlank() ? null : name.trim();
        user.setName(trimmedName);
        user.setEmail(normalizedEmail);
        user.setPhone(normalizedPhone);
        return view(users.saveAndFlush(user));
    }

    @Transactional
    void changePassword(long userId, String currentPassword, String newPassword) {
        User user = users.findById(userId).orElseThrow(AuthService::userNotFound);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD",
                "Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        users.save(user);
    }

    private AuthResult result(User user) {
        return new AuthResult(principal(user), jwtService.issue(user));
    }

    private static ProfileView view(User user) {
        return new ProfileView(user.getId(), user.getName(), user.getPhone(), user.getEmail());
    }

    private static AuthenticatedUser principal(User user) {
        return new AuthenticatedUser(user.getId(), user.getName(), user.getPhone(),
            user.getEmail(), user.getRole());
    }

    static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
    static String normalizePhone(String phone) { return phone.trim(); }
    private static String normalizeNullableEmail(String email) {
        return email == null || email.isBlank() ? null : normalize(email);
    }
    private static AuthException duplicatePhone() {
        return new AuthException(HttpStatus.CONFLICT, "PHONE_EXISTS",
            "An account with this phone number already exists");
    }
    private static AuthException duplicateEmail() {
        return new AuthException(HttpStatus.CONFLICT, "EMAIL_EXISTS",
            "An account with this email already exists");
    }
    private static AuthException invalidCustomerCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
            "Invalid phone or password");
    }
    private static AuthException invalidPrivilegedCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
            "Invalid email or password");
    }
    private static AuthException invalidProof() {
        return new AuthException(HttpStatus.BAD_REQUEST, "VERIFICATION_PROOF_INVALID",
            "The verification proof is invalid or expired");
    }
    private static AuthException userNotFound() {
        return new AuthException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Account not found");
    }

    record AuthResult(AuthenticatedUser user, String token) {}

    record ProfileView(Long id, String name, String phone, String email) {}
}
