-- Trial sites created by referrers straight from a lead.
-- is_trial marks an auto-created preview salon: it is publicly viewable but
-- booking and other functionality are blocked with a "trial site" notice.
ALTER TABLE salons ADD COLUMN is_trial BOOLEAN NOT NULL DEFAULT FALSE;

-- Links a referral lead to the salon its referrer created from it. Nullable:
-- most leads never become a site. Cleared when the trial site is deleted.
ALTER TABLE referral_leads ADD COLUMN created_salon_id BIGINT REFERENCES salons(id) ON DELETE SET NULL;
