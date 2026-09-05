-- Saved Rasms Registry (سجل الحفظ)
-- Stores finalized rasms for each notary user with a link to uploaded attachments (via deed_attachments).

CREATE TABLE IF NOT EXISTS saved_rasms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notary_user_id UUID NOT NULL,
  notary_name TEXT,
  file_number TEXT,
  document_type TEXT,
  draft TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_rasms_notary_user_id ON saved_rasms(notary_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_rasms_created_at ON saved_rasms(created_at DESC);

