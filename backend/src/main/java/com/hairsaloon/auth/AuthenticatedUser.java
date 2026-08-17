package com.hairsaloon.auth;

public record AuthenticatedUser(Long id, String email, UserRole role) {
}
