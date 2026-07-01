-- Up
ALTER TABLE contact_events ADD COLUMN upload_id UUID REFERENCES csv_uploads(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX idx_contact_events_upload_id ON contact_events(upload_id);