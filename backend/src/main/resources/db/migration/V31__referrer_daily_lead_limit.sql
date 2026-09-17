-- Per-referrer daily lead cap. NULL = use the global REFERRAL_LEADS_DAILY_LIMIT
-- default; the admin can set a specific number to raise it for one referrer.
ALTER TABLE referrer_profiles ADD COLUMN daily_lead_limit INTEGER;
