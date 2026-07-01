-- Drop existing unique constraint if any
ALTER TABLE packages DROP CONSTRAINT IF EXISTS unique_active_price;

-- Create partial unique index (active packages only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_unique_active_price
  ON packages (price) WHERE is_active = true;