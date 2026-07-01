-- Enums

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
      'matched',
      'flagged_overpayment',
      'flagged_underpayment',
      'flagged_no_match',
      'flagged_incomplete_package',
      'pending_package_completion',
      'pending_retry',
      'processing',
      'failed'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tip_status AS ENUM ('pending', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('advertising', 'tips_delivery', 'payment_confirmation', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('queued', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Packages (removed unique constraint here – moved to partial index later)
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL,
  game_count INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Potential Tiers
CREATE TABLE IF NOT EXISTS tiers_potential (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_number INTEGER UNIQUE NOT NULL,
  min_frequency INTEGER NOT NULL,
  max_frequency INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_range CHECK (min_frequency < max_frequency)
);

-- Active Tiers (letter)
CREATE TABLE IF NOT EXISTS tiers_active (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_letter CHAR(1) NOT NULL,
  min_purchases INTEGER NOT NULL,
  max_purchases INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_purchase_range CHECK (min_purchases < max_purchases)
);

-- Active Sub‑Tiers
CREATE TABLE IF NOT EXISTS tiers_active_sub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_number INTEGER UNIQUE NOT NULL,
  min_spend INTEGER NOT NULL,
  max_spend INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_spend_range CHECK (min_spend < max_spend)
);

-- CSV Uploads
CREATE TABLE IF NOT EXISTS csv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  total_rows INTEGER NOT NULL DEFAULT 0,
  new_contacts INTEGER NOT NULL DEFAULT 0,
  updated_contacts INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  error_log JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  phone_number VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255),
  frequency_count INTEGER NOT NULL DEFAULT 1,
  potential_tier INTEGER REFERENCES tiers_potential(tier_number),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_potential_tier ON contacts(potential_tier);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  phone_number VARCHAR(20) PRIMARY KEY REFERENCES contacts(phone_number),
  total_purchases INTEGER NOT NULL DEFAULT 0,
  tier_letter CHAR(1),
  tier_sub_number INTEGER,
  dominant_spend_range INTEGER REFERENCES tiers_active_sub(sub_number),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier_letter, tier_sub_number);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  mpesa_ref VARCHAR(255) UNIQUE NOT NULL,
  status payment_status NOT NULL,
  matched_package_id UUID REFERENCES packages(id),
  excess_amount INTEGER,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_phone ON payments(phone_number);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_resolved ON payments(resolved);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL REFERENCES contacts(phone_number),
  package_id UUID NOT NULL REFERENCES packages(id),
  payment_id UUID NOT NULL REFERENCES payments(id),
  amount_paid INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchases_phone ON purchases(phone_number);
CREATE INDEX IF NOT EXISTS idx_purchases_package ON purchases(package_id);

-- Tips
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_name VARCHAR(255) NOT NULL,
  prediction VARCHAR(255) NOT NULL,
  match_datetime TIMESTAMPTZ NOT NULL,
  status tip_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone VARCHAR(20) NOT NULL,
  message_type message_type NOT NULL,
  content TEXT NOT NULL,
  status message_status NOT NULL DEFAULT 'queued',
  sent_by UUID REFERENCES users(id),
  session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Outflow
CREATE TABLE IF NOT EXISTS outflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount INTEGER NOT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL CHECK (category IN ('Domain', 'VPS', 'SMS Gateway', 'Other')),
  entered_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (key, value)
SELECT 'payment_confirmation_template', 'Thank you for your payment of KES {amount}. Your tips will arrive shortly.'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'payment_confirmation_template');

INSERT INTO system_settings (key, value)
SELECT 'tips_delivery_template', 'Your tips:\n{tips}'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'tips_delivery_template');