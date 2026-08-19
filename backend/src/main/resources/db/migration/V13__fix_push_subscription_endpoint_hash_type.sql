-- Correct endpoint_hash column type from CHAR(64) to VARCHAR(64) to match JPA entity expectation.
ALTER TABLE push_subscriptions ALTER COLUMN endpoint_hash TYPE VARCHAR(64);
