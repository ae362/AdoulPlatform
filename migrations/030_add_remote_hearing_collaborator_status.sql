-- Add invitation lifecycle to remote_hearing_collaborators
-- pending -> accepted | declined

ALTER TABLE public.remote_hearing_collaborators
ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS responded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS declined_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_remote_hearing_collaborators_status
  ON public.remote_hearing_collaborators(status);

