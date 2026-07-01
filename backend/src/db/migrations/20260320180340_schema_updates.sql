-- Add cumulative received amount to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS total_received_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Add raw file path to csv_uploads
ALTER TABLE csv_uploads
  ADD COLUMN IF NOT EXISTS raw_file_path VARCHAR(500);