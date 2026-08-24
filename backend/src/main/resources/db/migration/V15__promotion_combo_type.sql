-- Combo offers: a fixed price for a bundle of services. The bundle price is
-- stored in discount_value, and the member services in promotion_services.
ALTER TABLE promotions DROP CONSTRAINT promotions_type_check;
ALTER TABLE promotions ADD CONSTRAINT promotions_type_check
    CHECK (discount_type IN ('PERCENT', 'FIXED', 'COMBO'));
