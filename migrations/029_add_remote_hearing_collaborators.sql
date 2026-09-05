-- Allow inviting other notaries to join a Remote Notarial Hearing (internal users)
-- while keeping a separate public meeting link for external guests.

CREATE TABLE IF NOT EXISTS public.remote_hearing_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.remote_hearing_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  collaborator_role varchar NOT NULL DEFAULT 'notary', -- notary | observer
  invited_by_user_id uuid,
  created_at timestamp with time zone DEFAULT now(),

  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_remote_hearing_collaborators_session
  ON public.remote_hearing_collaborators(session_id);
CREATE INDEX IF NOT EXISTS idx_remote_hearing_collaborators_user
  ON public.remote_hearing_collaborators(user_id);

ALTER TABLE public.remote_hearing_collaborators ENABLE ROW LEVEL SECURITY;

