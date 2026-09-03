-- Self-service account deletion (anonymize). The user row is kept so historical
-- bookings/reviews/referrals still reference it, but personal data is wiped, the
-- login is disabled, and the role becomes DELETED so any existing JWT is rejected.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('CUSTOMER', 'SALON_OWNER', 'PLATFORM_ADMIN', 'REFERRER', 'DELETED'));

ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
