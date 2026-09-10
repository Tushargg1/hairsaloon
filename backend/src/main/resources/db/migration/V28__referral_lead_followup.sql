-- Timed follow-up tracking for a contacted lead:
--   contacted_at    : when the referrer marked the lead CONTACTED (starts the 14h timer)
--   followup_stage  : 0 = none sent, 1 = Follow-up A sent, 2 = B sent, 3 = C sent
--   last_followup_at: when the most recent follow-up was sent (starts the 12h timer)
ALTER TABLE referral_leads ADD COLUMN contacted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE referral_leads ADD COLUMN followup_stage INTEGER NOT NULL DEFAULT 0;
ALTER TABLE referral_leads ADD COLUMN last_followup_at TIMESTAMP WITH TIME ZONE;
