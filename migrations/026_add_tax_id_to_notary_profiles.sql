-- Add Tax Identification Number to notary_profiles
-- Purpose: Allow storing/displaying رقم التعريف الضريبي (IF) for notaries

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'notary_profiles'
      AND column_name = 'tax_identification_number'
  ) THEN
    ALTER TABLE notary_profiles
      ADD COLUMN tax_identification_number text;

    COMMENT ON COLUMN notary_profiles.tax_identification_number IS 'رقم التعريف الضريبي (IF)';
  END IF;
END $$;
