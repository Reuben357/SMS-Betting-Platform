-- Add deleted_at to packages and tips
ALTER TABLE packages ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE tips ADD COLUMN deleted_at TIMESTAMPTZ;

-- Indexes for faster filtering
CREATE INDEX idx_packages_deleted_at ON packages(deleted_at);
CREATE INDEX idx_tips_deleted_at ON tips(deleted_at);

-- Add deleted_at to messages (if not already present)
ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_messages_deleted_at ON messages(deleted_at);
