-- Allow package_id to be NULL for subscription purchases
ALTER TABLE purchases ALTER COLUMN package_id DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN purchases.package_id IS 'NULL for subscription purchases (jackpot), references packages.id for regular tips';