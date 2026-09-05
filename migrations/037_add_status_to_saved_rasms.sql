-- Add workflow status to saved_rasms.
-- Some deployments were created without a dedicated status column; backend now treats it as optional.
-- This migration brings the schema in sync so status can be queried/indexed.

ALTER TABLE saved_rasms
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Optional default for new rows
ALTER TABLE saved_rasms
  ALTER COLUMN status SET DEFAULT 'DRAFT';

CREATE INDEX IF NOT EXISTS idx_saved_rasms_status ON saved_rasms(status);
