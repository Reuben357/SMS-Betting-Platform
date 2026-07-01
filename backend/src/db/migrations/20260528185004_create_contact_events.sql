-- Create contact_events table for cross‑upload deduplication
CREATE TABLE IF NOT EXISTS contact_events (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  date_created TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone_number, date_created)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contact_events_phone_date ON contact_events (phone_number, date_created);