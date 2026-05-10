-- Add is_active to customers
-- All existing customers have made at least one purchase, so they default to active.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;