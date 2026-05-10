-- Drop the existing unique constraint if it exists
ALTER TABLE packages DROP CONSTRAINT IF EXISTS unique_active_price;

-- Create a partial unique index: only enforce uniqueness for active packages
CREATE UNIQUE INDEX idx_packages_unique_active_price ON packages (price) WHERE is_active = true;