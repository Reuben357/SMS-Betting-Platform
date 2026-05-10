-- Add package_id to tips
ALTER TABLE tips ADD COLUMN package_id UUID REFERENCES packages(id);
ALTER TABLE tips ADD COLUMN "order" INTEGER;
ALTER TABLE tips ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Migrate existing tips: assign them to a default package (e.g., the first active package)
-- For safety, create a dummy package if none exists
DO $$
DECLARE
    default_pkg_id UUID;
BEGIN
    SELECT id INTO default_pkg_id FROM packages WHERE is_active = true LIMIT 1;
    IF default_pkg_id IS NULL THEN
        INSERT INTO packages (name, price, tip_count, game_count, is_active)
        VALUES ('Default', 0, 0, 0, true)
        RETURNING id INTO default_pkg_id;
    END IF;
    UPDATE tips SET package_id = default_pkg_id WHERE package_id IS NULL;
    -- Set an order based on id
    UPDATE tips t SET "order" = sub.rn
    FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY package_id ORDER BY created_at) AS rn FROM tips) sub
    WHERE t.id = sub.id;
END $$;

-- Make package_id NOT NULL after migration
ALTER TABLE tips ALTER COLUMN package_id SET NOT NULL;
ALTER TABLE tips ALTER COLUMN "order" SET NOT NULL;

-- -- Drop sessions tables if they exist (optional, but we won't use them)
-- DROP TABLE IF EXISTS tips_session_items;
-- DROP TABLE IF EXISTS tips_sessions;