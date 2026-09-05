-- Add appellate_court and primary_court columns to notary_profiles
-- Run this migration to add the new court fields

-- Add appellate_court column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notary_profiles' AND column_name = 'appellate_court'
  ) THEN
    ALTER TABLE notary_profiles ADD COLUMN appellate_court text;
  END IF;
END $$;

-- Add primary_court column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notary_profiles' AND column_name = 'primary_court'
  ) THEN
    ALTER TABLE notary_profiles ADD COLUMN primary_court text;
  END IF;
END $$;

-- Populate appellate_court from existing court_name for existing records
UPDATE notary_profiles 
SET appellate_court = court_name 
WHERE appellate_court IS NULL;

-- Comment
COMMENT ON COLUMN notary_profiles.appellate_court IS 'محكمة الاستئناف (always required)';
COMMENT ON COLUMN notary_profiles.primary_court IS 'المحكمة الابتدائية (optional)';
