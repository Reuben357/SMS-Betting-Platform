-- Add package_id to tips
ALTER TABLE tips ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES packages(id);
ALTER TABLE tips ADD COLUMN IF NOT EXISTS "order" INTEGER;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Migrate existing tips: assign to first active package (safe even if run partially)
DO $$
DECLARE
    default_pkg_id UUID;
    tips_count INT;
BEGIN
    SELECT COUNT(*) INTO tips_count FROM tips;
    IF tips_count > 0 THEN
        SELECT id INTO default_pkg_id FROM packages WHERE is_active = true LIMIT 1;
        IF default_pkg_id IS NULL THEN
            INSERT INTO packages (name, price, game_count, is_active)
            VALUES ('Default', 0, 0, true)
            RETURNING id INTO default_pkg_id;
        END IF;
        UPDATE tips SET package_id = default_pkg_id WHERE package_id IS NULL;
    END IF;
END $$;

-- Now enforce NOT NULL only after data is migrated
ALTER TABLE tips ALTER COLUMN package_id SET NOT NULL;
ALTER TABLE tips ALTER COLUMN "order" SET NOT NULL;