package com.hairsaloon.auth;

public enum UserRole {
    CUSTOMER,
    SALON_OWNER,
    PLATFORM_ADMIN,
    REFERRER,
    /** A self-deleted (anonymized) account: cannot log in; history is retained. */
    DELETED
}
