-- Label of the most recent WhatsApp script the referrer sent to a lead, shown on
-- the lead card (e.g. "Message 2", "Follow-up A").
ALTER TABLE referral_leads ADD COLUMN last_script VARCHAR(40);
