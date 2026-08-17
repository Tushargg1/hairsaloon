-- Make phone required and unique, email optional (customer-only signup by phone)
-- Fill existing users with a placeholder phone so NOT NULL can be applied
UPDATE users SET phone = 'legacy_' || id WHERE phone IS NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
