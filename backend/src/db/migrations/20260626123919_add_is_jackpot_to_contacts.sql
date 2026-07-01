-- Add a boolean flag to mark Jackpot customers
ALTER TABLE contacts ADD COLUMN is_jackpot BOOLEAN DEFAULT FALSE;

-- Create an index for faster filtering
CREATE INDEX idx_contacts_is_jackpot ON contacts(is_jackpot) WHERE is_jackpot = true;