-- Animated character shown in the booking widget avatar. Stores the catalogue
-- key only; the clip itself is a static asset served by the frontend.
ALTER TABLE salon_staff ADD COLUMN character_key VARCHAR(40);
