-- Optional coordinates so the public directory can rank salons by distance.
-- Both columns are nullable: existing salons stay searchable by city text until
-- their owner supplies a location, and distance sorting simply skips them.
ALTER TABLE salons ADD COLUMN latitude NUMERIC(9, 6);
ALTER TABLE salons ADD COLUMN longitude NUMERIC(9, 6);

ALTER TABLE salons ADD CONSTRAINT salons_latitude_check
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
ALTER TABLE salons ADD CONSTRAINT salons_longitude_check
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- A salon is only usable for proximity search when both values are present.
ALTER TABLE salons ADD CONSTRAINT salons_coordinate_pair_check
    CHECK ((latitude IS NULL AND longitude IS NULL)
        OR (latitude IS NOT NULL AND longitude IS NOT NULL));

-- Supports the bounding-box prefilter applied before the haversine calculation.
CREATE INDEX idx_salons_coordinates ON salons(latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
