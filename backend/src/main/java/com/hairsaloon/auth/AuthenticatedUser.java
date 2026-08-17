package com.hairsaloon.auth;

public record AuthenticatedUser(Long id, String phone, String email, UserRole role) {
}
