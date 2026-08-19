package com.hairsaloon.auth;

import java.util.concurrent.atomic.AtomicLong;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class TestUserFactory {
    private static final AtomicLong PHONES = new AtomicLong(7_000_000_000L);

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtService jwt;

    TestUserFactory(UserRepository users, PasswordEncoder passwords, JwtService jwt) {
        this.users = users;
        this.passwords = passwords;
        this.jwt = jwt;
    }

    public Identity create(String email, UserRole role) {
        String phone = Long.toString(PHONES.incrementAndGet());
        User user = users.saveAndFlush(new User(phone, email,
            passwords.encode("Password123!"), role));
        return new Identity(user.getId(), phone, jwt.issue(user));
    }

    public String nextPhone() {
        return Long.toString(PHONES.incrementAndGet());
    }

    public record Identity(long id, String phone, String token) {}
}
