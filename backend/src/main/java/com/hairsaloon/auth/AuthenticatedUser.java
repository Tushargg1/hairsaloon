package com.hairsaloon.auth;

public record AuthenticatedUser(Long id, String name, String phone, String email, UserRole role) {
}
