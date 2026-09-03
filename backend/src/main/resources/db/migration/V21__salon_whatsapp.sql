-- WhatsApp Cloud API connection per salon (via Meta Embedded Signup).
-- The access token is stored so the backend can send messages on the salon's
-- behalf; the phone number id identifies which salon an inbound webhook is for.
ALTER TABLE salons ADD COLUMN whatsapp_phone_number_id VARCHAR(64);
ALTER TABLE salons ADD COLUMN whatsapp_waba_id VARCHAR(64);
ALTER TABLE salons ADD COLUMN whatsapp_display_number VARCHAR(32);
ALTER TABLE salons ADD COLUMN whatsapp_access_token TEXT;
ALTER TABLE salons ADD COLUMN whatsapp_bot_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE salons ADD COLUMN whatsapp_connected_at TIMESTAMPTZ;

-- Inbound webhooks arrive keyed by phone_number_id, so it must map to one salon.
CREATE UNIQUE INDEX uq_salons_whatsapp_phone_number_id
    ON salons (whatsapp_phone_number_id)
    WHERE whatsapp_phone_number_id IS NOT NULL;
