-- Add Zoom/Teams-style meeting links for Remote Notarial Hearing
-- One shareable link per session, controlled by the notary/judge.

ALTER TABLE public.remote_hearing_sessions
ADD COLUMN IF NOT EXISTS meeting_join_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS meeting_join_token varchar,
ADD COLUMN IF NOT EXISTS meeting_join_expires_at timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS idx_remote_hearing_sessions_meeting_join_token
  ON public.remote_hearing_sessions(meeting_join_token)
  WHERE meeting_join_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_remote_hearing_sessions_meeting_join_enabled
  ON public.remote_hearing_sessions(meeting_join_enabled);

