-- Migration 056: Create Mutual Notary Partnerships & Requests
-- Upgrades notary_partners to link registered notaries mutually with request/acceptance workflow

DO $$
BEGIN
  -- Add partner_user_id to notary_partners if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notary_partners' AND column_name = 'partner_user_id'
  ) THEN
    ALTER TABLE notary_partners ADD COLUMN partner_user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  -- Add pairing_id to notary_partners if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notary_partners' AND column_name = 'pairing_id'
  ) THEN
    ALTER TABLE notary_partners ADD COLUMN pairing_id UUID;
  END IF;

  -- Add inviter_user_id to notary_partners if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notary_partners' AND column_name = 'inviter_user_id'
  ) THEN
    ALTER TABLE notary_partners ADD COLUMN inviter_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Add status to notary_partners if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notary_partners' AND column_name = 'status'
  ) THEN
    ALTER TABLE notary_partners ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
  END IF;
END $$;

-- Create notary_partnership_requests table
CREATE TABLE IF NOT EXISTS notary_partnership_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES notary_profiles(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notary_partners_partner_user_id ON notary_partners(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_notary_partners_pairing_id ON notary_partners(pairing_id);
CREATE INDEX IF NOT EXISTS idx_partnership_requests_recipient ON notary_partnership_requests(recipient_user_id, status);
CREATE INDEX IF NOT EXISTS idx_partnership_requests_sender ON notary_partnership_requests(sender_user_id, status);

COMMENT ON TABLE notary_partnership_requests IS 'Requests between registered notaries to form a mutual accompany / 2nd notary partnership';
COMMENT ON COLUMN notary_partners.partner_user_id IS 'Direct reference to the registered user account of the partner notary';
COMMENT ON COLUMN notary_partners.pairing_id IS 'Unique identifier shared by both bilateral records of the mutual partnership';

