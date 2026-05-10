
-- Add raw_payload column to payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- Add index on resolved for flagged payment queries
CREATE INDEX IF NOT EXISTS idx_payments_flagged
  ON payments(status, resolved)
  WHERE status != 'matched';