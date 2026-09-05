-- Add description column to notary_profiles table
ALTER TABLE notary_profiles ADD COLUMN IF NOT EXISTS description TEXT;
