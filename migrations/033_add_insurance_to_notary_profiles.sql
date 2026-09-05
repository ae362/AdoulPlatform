-- Add Insurance Policy Number to notary_profiles
-- Purpose: Allow storing/displaying رقم التأمين for notaries

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'notary_profiles'
      AND column_name = 'insurance_policy_number'
  ) THEN
    ALTER TABLE notary_profiles
      ADD COLUMN insurance_policy_number text;

    COMMENT ON COLUMN notary_profiles.insurance_policy_number IS 'رقم التأمين المهني';
  END IF;
END $$;
