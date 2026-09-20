-- Migration 055: Create Dual Notary Signing Sessions & Cryptographic Audit System
-- Supports the Dual Notary Signing Engine (محرك جلسة توقيع العدلين) in Notary Signing Corridor

-- 1. Dual Notary Signing Sessions Table
CREATE TABLE IF NOT EXISTS public.signing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT NOT NULL UNIQUE, -- e.g. DS-2026-0001245
  act_id UUID NOT NULL, -- references saved_rasms.id
  act_number TEXT NOT NULL, -- e.g. 2026/1245
  document_type TEXT,
  document_title TEXT,
  document_version INTEGER NOT NULL DEFAULT 1,
  document_hash TEXT NOT NULL, -- SHA-256 hex string of the immutable locked snapshot
  status TEXT NOT NULL DEFAULT 'WAITING_FOR_FIRST_SIGNATURE',
  is_locked BOOLEAN NOT NULL DEFAULT true,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notary_1_id UUID NOT NULL,
  notary_1_name TEXT NOT NULL,
  notary_2_id UUID,
  notary_2_name TEXT,
  rejection_reason TEXT,
  rejection_note TEXT,
  final_package_url TEXT,
  final_package_hash TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_signing_sessions_act_id ON public.signing_sessions(act_id);
CREATE INDEX IF NOT EXISTS idx_signing_sessions_notary_1 ON public.signing_sessions(notary_1_id);
CREATE INDEX IF NOT EXISTS idx_signing_sessions_notary_2 ON public.signing_sessions(notary_2_id);
CREATE INDEX IF NOT EXISTS idx_signing_sessions_status ON public.signing_sessions(status);
CREATE INDEX IF NOT EXISTS idx_signing_sessions_created_at ON public.signing_sessions(created_at DESC);

-- 2. Signing Participants Table (Notary 1 and Notary 2 signing slots)
CREATE TABLE IF NOT EXISTS public.signing_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.signing_sessions(id) ON DELETE CASCADE,
  notary_id UUID,
  notary_name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'PRIMARY_NOTARY' | 'SECONDARY_NOTARY'
  signing_order INTEGER NOT NULL, -- 1 = First notary, 2 = Second notary
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'VIEWED', 'SIGNING', 'SIGNED', 'REJECTED'
  signed_at TIMESTAMPTZ,
  signed_hash TEXT, -- Document hash verified at moment of signing
  signature_data TEXT, -- Base64 PNG or ink capture
  signature_hash TEXT, -- SHA-256 of the signature blob
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signing_participants_session ON public.signing_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_signing_participants_notary ON public.signing_participants(notary_id);

-- 3. Signing Tasks Table (Official signing dispatch to Notary 2)
CREATE TABLE IF NOT EXISTS public.signing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code TEXT NOT NULL UNIQUE, -- e.g. ST-2026-88451
  session_id UUID NOT NULL REFERENCES public.signing_sessions(id) ON DELETE CASCADE,
  act_id UUID NOT NULL,
  act_number TEXT NOT NULL,
  document_type TEXT,
  document_hash TEXT NOT NULL,
  assigned_to_notary_id UUID,
  assigned_to_notary_name TEXT,
  assigned_by_notary_id UUID NOT NULL,
  assigned_by_notary_name TEXT NOT NULL,
  required_action TEXT NOT NULL DEFAULT 'SIGN',
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'VIEWED', 'COMPLETED', 'REJECTED', 'EXPIRED', 'CANCELLED'
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_signing_tasks_assigned_to ON public.signing_tasks(assigned_to_notary_id);
CREATE INDEX IF NOT EXISTS idx_signing_tasks_status ON public.signing_tasks(status);
CREATE INDEX IF NOT EXISTS idx_signing_tasks_created_at ON public.signing_tasks(created_at DESC);

-- 4. Cryptographic Signature Events (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS public.signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.signing_sessions(id) ON DELETE CASCADE,
  notary_id UUID,
  notary_name TEXT,
  event_type TEXT NOT NULL,
  -- 'SESSION_CREATED', 'DOCUMENT_LOCKED', 'NOTARY_1_SIGNED', 'NOTARY_2_INVITED',
  -- 'NOTARY_2_VIEWED', 'INTEGRITY_VERIFIED', 'INTEGRITY_FAILED', 'NOTARY_2_SIGNED',
  -- 'SESSION_COMPLETED', 'SESSION_CANCELLED', 'SIGNATURE_REJECTED'
  document_hash TEXT,
  device_id TEXT,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_signature_events_session ON public.signature_events(session_id);
CREATE INDEX IF NOT EXISTS idx_signature_events_timestamp ON public.signature_events(timestamp DESC);

-- Grant privileges for service_role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.signing_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.signing_participants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.signing_tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.signature_events TO service_role;

