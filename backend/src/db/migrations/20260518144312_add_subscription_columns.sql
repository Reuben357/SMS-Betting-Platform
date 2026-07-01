-- Subscription columns for customers
ALTER TABLE customers 
  ADD COLUMN IF NOT EXISTS total_subscriptions INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_subscription_amount INT DEFAULT 0;

-- Flag purchases as subscription
ALTER TABLE purchases 
  ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false;

-- Subscription settings
INSERT INTO system_settings (key, value)
SELECT 'subscription_price', '15'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'subscription_price');

INSERT INTO system_settings (key, value)
SELECT 'subscription_tips_template', '1,2,2,1,x'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'subscription_tips_template');

-- Price history table
CREATE TABLE IF NOT EXISTS subscription_price_history (
  id SERIAL PRIMARY KEY,
  price INT NOT NULL,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  set_by UUID REFERENCES users(id)
);