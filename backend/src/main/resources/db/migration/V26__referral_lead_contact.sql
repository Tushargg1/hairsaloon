-- Referrer's own contact status for a delivered lead (their call outcome), plus
-- the salon's website captured from the scraper for quick reference.
ALTER TABLE referral_leads ADD COLUMN contact_status VARCHAR(24) NOT NULL DEFAULT 'NEW';
ALTER TABLE referral_leads ADD COLUMN salon_name VARCHAR(200);
ALTER TABLE referral_leads ADD COLUMN salon_phone VARCHAR(40);
ALTER TABLE referral_leads ADD COLUMN salon_website TEXT;
ALTER TABLE referral_leads ADD COLUMN salon_maps_url TEXT;
ALTER TABLE referral_leads ADD COLUMN salon_location VARCHAR(300);
