-- Owner-defined order for the price list categories, newline separated.
-- Categories are free text on services, so this is a display ordering only:
-- names not listed here fall to the end alphabetically.
ALTER TABLE salons ADD COLUMN category_order TEXT;
