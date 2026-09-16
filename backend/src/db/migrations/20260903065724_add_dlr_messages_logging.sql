ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS message_provider_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_provider_id
    ON messages(message_provider_id) WHERE message_provider_id IS NOT NULL;