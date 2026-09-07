-- Extra salon details captured with a referral: the contact person's name and
-- the salon's location/address (both optional; can be auto-filled from Google).
ALTER TABLE referral_submissions ADD COLUMN contact_name VARCHAR(160);
ALTER TABLE referral_submissions ADD COLUMN salon_address VARCHAR(500);
