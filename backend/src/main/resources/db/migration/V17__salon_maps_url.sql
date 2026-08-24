-- A Google Maps link replaces the generic website link: salons want customers
-- routed to directions, and the public page already generates a fallback search.
ALTER TABLE salons ADD COLUMN maps_url TEXT;
ALTER TABLE salons DROP COLUMN website_url;
