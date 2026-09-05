-- Add DOB and CIN to notary_profiles table
ALTER TABLE notary_profiles
ADD COLUMN IF NOT EXISTS dob TEXT,
ADD COLUMN IF NOT EXISTS cin TEXT;
