-- Add profile_picture_url column to notary_profiles table
-- This allows notaries to upload their profile picture

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notary_profiles' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE notary_profiles ADD COLUMN profile_picture_url text;
  END IF;
END $$;

-- Comment
COMMENT ON COLUMN notary_profiles.profile_picture_url IS 'URL or base64 data of the notary profile picture';
