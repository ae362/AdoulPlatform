-- Add updated_at column to saved_rasms table
ALTER TABLE saved_rasms
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to have updated_at = created_at
UPDATE saved_rasms
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Create index for updated_at column
CREATE INDEX IF NOT EXISTS idx_saved_rasms_updated_at ON saved_rasms(updated_at DESC);
