ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN booking_source VARCHAR(16);
ALTER TABLE bookings ADD COLUMN guest_name VARCHAR(160);
ALTER TABLE bookings ADD COLUMN guest_phone VARCHAR(32);

UPDATE bookings SET booking_source = 'ONLINE';
ALTER TABLE bookings ALTER COLUMN booking_source SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN booking_source SET DEFAULT 'ONLINE';

ALTER TABLE bookings ADD CONSTRAINT bookings_source_check
    CHECK (booking_source IN ('ONLINE', 'WALK_IN'));
ALTER TABLE bookings ADD CONSTRAINT bookings_customer_guest_check CHECK (
    (booking_source = 'ONLINE' AND customer_id IS NOT NULL
        AND guest_name IS NULL AND guest_phone IS NULL)
    OR
    (booking_source = 'WALK_IN' AND customer_id IS NULL
        AND guest_name IS NOT NULL AND LENGTH(TRIM(guest_name)) BETWEEN 1 AND 160
        AND guest_phone IS NOT NULL AND LENGTH(TRIM(guest_phone)) BETWEEN 7 AND 32
        AND guest_phone ~ '^[+0-9() .-]{7,32}$')
);

CREATE INDEX idx_bookings_salon_source_start
    ON bookings(salon_id, booking_source, start_datetime);
