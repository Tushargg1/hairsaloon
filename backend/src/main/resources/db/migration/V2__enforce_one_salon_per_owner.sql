ALTER TABLE salons
    ADD CONSTRAINT uq_salons_owner_id UNIQUE (owner_id);
