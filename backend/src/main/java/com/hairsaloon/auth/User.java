package com.hairsaloon.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 160)
    private String name;

    @Column(unique = true, length = 320)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private UserRole role;

    @Column(length = 32, nullable = false, unique = true)
    private String phone;

    @Column(name = "phone_verified_at")
    private Instant phoneVerifiedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected User() {
    }

    User(String phone, String email, String passwordHash, UserRole role) {
        this.phone = phone;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public UserRole getRole() {
        return role;
    }

    public Instant getPhoneVerifiedAt() {
        return phoneVerifiedAt;
    }

    void markPhoneVerified(Instant verifiedAt) {
        this.phoneVerifiedAt = verifiedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public boolean isDeleted() {
        return role == UserRole.DELETED;
    }

    /**
     * Anonymizes the account: wipes personal data, disables login (unusable
     * password hash), and flips the role to DELETED so existing tokens are rejected.
     * Historical rows (bookings, reviews, referrals) keep referencing this row.
     */
    void anonymize(String scrambledPhone, String unusablePasswordHash) {
        this.name = null;
        this.email = null;
        this.phone = scrambledPhone;
        this.passwordHash = unusablePasswordHash;
        this.phoneVerifiedAt = null;
        this.role = UserRole.DELETED;
        this.deletedAt = Instant.now();
    }
}
