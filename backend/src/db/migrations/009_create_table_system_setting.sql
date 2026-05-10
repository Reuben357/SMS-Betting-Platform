CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (key, value) VALUES
  ('payment_confirmation_template', 'Thank you for your payment of KES {amount}. Your tips will arrive shortly.'),
  ('tips_delivery_template', 'Your tips:\n{tips}')
ON CONFLICT (key) DO NOTHING;