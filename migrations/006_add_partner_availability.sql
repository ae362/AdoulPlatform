-- Add is_available column to notary_partners table
-- This allows notaries to mark which partners are currently available for work

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notary_partners' AND column_name = 'is_available'
  ) THEN
    ALTER TABLE notary_partners ADD COLUMN is_available boolean DEFAULT true;
  END IF;
END $$;

-- Comment
COMMENT ON COLUMN notary_partners.is_available IS 'Indicates if the partner is currently available for work';
