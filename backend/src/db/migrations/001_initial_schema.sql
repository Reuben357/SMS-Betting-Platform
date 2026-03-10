-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE payment_status AS ENUM (
  'matched',
  'flagged_overpayment',
  'flagged_underpayment',
  'flagged_no_match'
);

CREATE TYPE tip_status AS ENUM (
  'pending',
  'won',
  'lost'
);

CREATE TYPE message_type AS ENUM (
  'advertising',
  'tips_delivery',
  'payment_confirmation',
  'custom'
);

CREATE TYPE message_status AS ENUM (
  'queued',
  'sent',
  'failed'
);

-- =============================================
-- USERS
-- =============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PACKAGES
-- =============================================

CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL,
  tip_count INTEGER NOT NULL,
  game_count INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_active_price UNIQUE (price)
);

-- Seed the three confirmed packages
INSERT INTO packages (name, price, tip_count, game_count) VALUES
  ('4 Odds', 15, 4, 5),
  ('8 Odds', 30, 8, 10),
  ('10 Odds', 50, 10, 15);

-- =============================================
-- POTENTIAL CUSTOMER TIERS (configuration)
-- =============================================

CREATE TABLE tiers_potential (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_number INTEGER UNIQUE NOT NULL,
  min_frequency INTEGER NOT NULL,
  max_frequency INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_range CHECK (min_frequency < max_frequency)
);

-- Seed default thresholds (intervals of 50)
INSERT INTO tiers_potential (tier_number, min_frequency, max_frequency) VALUES
  (1, 1,   50),
  (2, 51,  100),
  (3, 101, 150),
  (4, 151, 200),
  (5, 201, 250);

-- =============================================
-- ACTIVE CUSTOMER TIERS (configuration)
-- =============================================

CREATE TABLE tiers_active (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_letter CHAR(1) NOT NULL,
  min_purchases INTEGER NOT NULL,
  max_purchases INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_purchase_range CHECK (min_purchases < max_purchases)
);

-- Seed default letter tiers
INSERT INTO tiers_active (tier_letter, min_purchases, max_purchases) VALUES
  ('A', 1,   50),
  ('B', 51,  100),
  ('C', 101, 150),
  ('D', 151, 200);

CREATE TABLE tiers_active_sub (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_number INTEGER UNIQUE NOT NULL,
  min_spend INTEGER NOT NULL,
  max_spend INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_spend_range CHECK (min_spend < max_spend)
);

-- Seed default sub-tiers based on confirmed packages
INSERT INTO tiers_active_sub (sub_number, min_spend, max_spend) VALUES
  (1, 15, 30),
  (2, 31, 50);

-- =============================================
-- CSV UPLOADS
-- =============================================

CREATE TABLE csv_uploads (
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

-- =============================================
-- CONTACTS (potential customers)
-- =============================================

CREATE TABLE contacts (
  phone_number VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255),
  frequency_count INTEGER NOT NULL DEFAULT 1,
  potential_tier INTEGER REFERENCES tiers_potential(tier_number),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast tier-based queries (e.g. send SMS to Tier 2)
CREATE INDEX idx_contacts_potential_tier ON contacts(potential_tier);

-- =============================================
-- CUSTOMERS (active — have made at least one purchase)
-- =============================================

CREATE TABLE customers (
  phone_number VARCHAR(20) PRIMARY KEY REFERENCES contacts(phone_number),
  total_purchases INTEGER NOT NULL DEFAULT 0,
  tier_letter CHAR(1),
  tier_sub_number INTEGER,
  dominant_spend_range INTEGER REFERENCES tiers_active_sub(sub_number),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_tier ON customers(tier_letter, tier_sub_number);

-- =============================================
-- PAYMENTS (raw M-Pesa callbacks)
-- =============================================

CREATE TABLE payments (
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

-- UNIQUE on mpesa_ref enforces idempotency —
-- the same M-Pesa transaction can never be processed twice
CREATE INDEX idx_payments_phone ON payments(phone_number);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_resolved ON payments(resolved);

-- =============================================
-- PURCHASES (confirmed fulfilled transactions)
-- =============================================

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL REFERENCES contacts(phone_number),
  package_id UUID NOT NULL REFERENCES packages(id),
  payment_id UUID NOT NULL REFERENCES payments(id),
  amount_paid INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_phone ON purchases(phone_number);
CREATE INDEX idx_purchases_package ON purchases(package_id);

-- =============================================
-- TIPS
-- =============================================

CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_name VARCHAR(255) NOT NULL,
  prediction VARCHAR(255) NOT NULL,
  match_datetime TIMESTAMPTZ NOT NULL,
  status tip_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TIPS DELIVERY SESSIONS
-- Links a set of tips to a specific send event
-- =============================================

CREATE TABLE tips_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(255),
  delivery_message TEXT,
  confirmation_message TEXT,
  advertising_message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tips_session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tips_sessions(id),
  tip_id UUID NOT NULL REFERENCES tips(id)
);

-- =============================================
-- OUTBOUND MESSAGES LOG
-- =============================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone VARCHAR(20) NOT NULL,
  message_type message_type NOT NULL,
  content TEXT NOT NULL,
  status message_status NOT NULL DEFAULT 'queued',
  sent_by UUID REFERENCES users(id),
  session_id UUID REFERENCES tips_sessions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_phone ON messages(recipient_phone);
CREATE INDEX idx_messages_status ON messages(status);

-- =============================================
-- OUTFLOW (manually entered expenses)
-- =============================================

CREATE TABLE outflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount INTEGER NOT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL CHECK (
    category IN ('Domain', 'VPS', 'SMS Gateway', 'Other')
  ),
  entered_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);