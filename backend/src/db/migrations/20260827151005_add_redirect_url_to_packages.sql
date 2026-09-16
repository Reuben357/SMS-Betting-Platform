-- Optional customer-facing link per package, independently toggleable.
ALTER TABLE packages
    ADD COLUMN IF NOT EXISTS redirect_url TEXT,
    ADD COLUMN IF NOT EXISTS redirect_url_enabled BOOLEAN NOT NULL DEFAULT false;

-- https-only, single line, capped length.
ALTER TABLE packages
    ADD CONSTRAINT chk_redirect_url_https
        CHECK (redirect_url IS NULL OR redirect_url ~ '^https://[^[:space:]]+$');

ALTER TABLE packages
    ADD CONSTRAINT chk_redirect_url_length
        CHECK (redirect_url IS NULL OR char_length(redirect_url) <= 300);