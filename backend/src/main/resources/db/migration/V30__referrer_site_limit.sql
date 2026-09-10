-- Per-referrer cap on active trial sites. Admin can raise it beyond the default 50.
ALTER TABLE referrer_profiles ADD COLUMN site_limit INTEGER NOT NULL DEFAULT 50;
