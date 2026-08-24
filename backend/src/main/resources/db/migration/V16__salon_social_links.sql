-- Public social profiles for the salon page footer.
ALTER TABLE salons
    ADD COLUMN instagram_url TEXT,
    ADD COLUMN facebook_url TEXT,
    ADD COLUMN whatsapp_url TEXT,
    ADD COLUMN youtube_url TEXT,
    ADD COLUMN website_url TEXT;
