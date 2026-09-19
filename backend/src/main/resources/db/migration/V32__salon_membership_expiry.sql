-- Membership expiry for onboarded (paid) salons. NULL = no expiry tracked yet.
-- When set and in the past, the salon is treated as "pending payment" in the admin
-- list (its paid month has ended) until the admin extends it.
ALTER TABLE salons ADD COLUMN membership_expires_at TIMESTAMP WITH TIME ZONE;
