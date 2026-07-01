-- Make package_id nullable in tips (for future subscription tips if needed)
ALTER TABLE tips ALTER COLUMN package_id DROP NOT NULL;

-- Remove the "Default" package if it exists and has no tips
DO $$
DECLARE
default_pkg_id UUID;
    tips_count INT;
BEGIN
    -- Find the default package created by old migration
SELECT id INTO default_pkg_id FROM packages
WHERE name = 'Default' AND price = 0 AND game_count = 0;

IF default_pkg_id IS NOT NULL THEN
        -- Check if any tips use this package
SELECT COUNT(*) INTO tips_count FROM tips WHERE package_id = default_pkg_id;

IF tips_count = 0 THEN
            -- Safe to delete
DELETE FROM packages WHERE id = default_pkg_id;
RAISE NOTICE 'Removed orphaned Default package';
ELSE
            -- Keep but mark inactive
UPDATE packages SET is_active = false WHERE id = default_pkg_id;
RAISE NOTICE 'Default package has tips, marked inactive instead';
END IF;
END IF;
END $$;