CREATE TABLE tiers_jp_potential (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_number INTEGER NOT NULL UNIQUE,
    min_jp_frequency INTEGER NOT NULL,
    max_jp_frequency INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);