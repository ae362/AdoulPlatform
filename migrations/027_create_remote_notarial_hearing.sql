-- Remote Notarial Hearing (التلقي عن بُعد)
-- Core tables to support sessions, participants, identity verification, recording metadata,
-- smart reminders, and audit trail.

CREATE TABLE IF NOT EXISTS public.remote_hearing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Human-friendly identifier (can be displayed as "00125" or "RH-2026-000125")
  session_number varchar UNIQUE NOT NULL,

  -- Ownership / assignment
  created_by_user_id uuid NOT NULL,
  notary1_user_id uuid NOT NULL,
  notary2_user_id uuid,
  assigned_judge_user_id uuid,

  -- Scheduling
  scheduled_at timestamp with time zone NOT NULL,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,

  -- Plan: 1 (عدل + عدل عن بعد) / 2 (عدلَان + أطراف عن بعد)
  scenario_plan integer,

  -- Status lifecycle
  status varchar NOT NULL DEFAULT 'scheduled',

  -- Legal linkage summary (details can be stored in remote_hearing_legal_links)
  legal_reference text,

  -- Decision / referral
  decision_result varchar,
  decision_notes text,
  referral_targets jsonb,

  -- Derived / misc
  metadata jsonb,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remote_hearing_sessions_scheduled_at
  ON public.remote_hearing_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_remote_hearing_sessions_status
  ON public.remote_hearing_sessions(status);
CREATE INDEX IF NOT EXISTS idx_remote_hearing_sessions_notary1
  ON public.remote_hearing_sessions(notary1_user_id);
CREATE INDEX IF NOT EXISTS idx_remote_hearing_sessions_assigned_judge
  ON public.remote_hearing_sessions(assigned_judge_user_id);

ALTER TABLE public.remote_hearing_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.remote_hearing_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.remote_hearing_sessions(id) ON DELETE CASCADE,

  participant_role varchar NOT NULL DEFAULT 'party', -- party | notary | judge | witness | agent
  attendance_mode varchar NOT NULL DEFAULT 'remote', -- remote | in_person

  full_name varchar NOT NULL,
  national_id varchar,
  phone varchar,
  email varchar,
  capacity varchar, -- صفة الحضور

  is_adult boolean,
  is_required boolean DEFAULT true,
  absence_reason text,

  join_token varchar UNIQUE,
  joined_at timestamp with time zone,
  left_at timestamp with time zone,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remote_hearing_participants_session
  ON public.remote_hearing_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_remote_hearing_participants_join_token
  ON public.remote_hearing_participants(join_token);

ALTER TABLE public.remote_hearing_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.remote_hearing_identity_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.remote_hearing_sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.remote_hearing_participants(id) ON DELETE CASCADE,

  id_card_verified boolean DEFAULT false,
  face_match_verified boolean DEFAULT false,
  voice_match_verified boolean DEFAULT false,
  doc_upload_url text,
  live_photo_url text,

  result_status varchar NOT NULL DEFAULT 'pending', -- pending | passed | failed
  verified_by_user_id uuid,
  verified_at timestamp with time zone,
  notes text,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  UNIQUE(session_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_remote_hearing_identity_session
  ON public.remote_hearing_identity_checks(session_id);
CREATE INDEX IF NOT EXISTS idx_remote_hearing_identity_participant
  ON public.remote_hearing_identity_checks(participant_id);

ALTER TABLE public.remote_hearing_identity_checks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.remote_hearing_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.remote_hearing_sessions(id) ON DELETE CASCADE,

  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  status varchar NOT NULL DEFAULT 'recording', -- recording | completed | failed

  storage_path text,
  file_url text,
  mime_type varchar,
  size_bytes bigint,
  sha256 varchar,
  failure_reason text,

  created_by_user_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remote_hearing_recordings_session
  ON public.remote_hearing_recordings(session_id);

ALTER TABLE public.remote_hearing_recordings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.remote_hearing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.remote_hearing_sessions(id) ON DELETE CASCADE,
  actor_user_id uuid,
  event_type varchar NOT NULL,
  payload jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remote_hearing_events_session
  ON public.remote_hearing_events(session_id);
CREATE INDEX IF NOT EXISTS idx_remote_hearing_events_type
  ON public.remote_hearing_events(event_type);

ALTER TABLE public.remote_hearing_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.remote_hearing_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.remote_hearing_sessions(id) ON DELETE CASCADE,

  reminder_kind varchar NOT NULL, -- before_24h | before_2h | before_15m | after_recording_failed | after_missing_docs | ...
  channel varchar NOT NULL DEFAULT 'in_app', -- in_app | sms | email
  target_user_id uuid,
  target_participant_id uuid REFERENCES public.remote_hearing_participants(id) ON DELETE SET NULL,

  message text NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  status varchar NOT NULL DEFAULT 'scheduled', -- scheduled | sent | failed | dismissed
  sent_at timestamp with time zone,
  error text,

  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remote_hearing_reminders_session
  ON public.remote_hearing_reminders(session_id);
CREATE INDEX IF NOT EXISTS idx_remote_hearing_reminders_scheduled_for
  ON public.remote_hearing_reminders(scheduled_for);

ALTER TABLE public.remote_hearing_reminders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.remote_hearing_legal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.remote_hearing_sessions(id) ON DELETE CASCADE,
  link_type varchar NOT NULL, -- contract | judicial_notification | external | other
  link_id varchar,
  link_label text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remote_hearing_legal_links_session
  ON public.remote_hearing_legal_links(session_id);

ALTER TABLE public.remote_hearing_legal_links ENABLE ROW LEVEL SECURITY;

