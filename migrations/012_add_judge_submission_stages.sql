-- Add notary-facing workflow stage tracking to judge_submissions
-- Stages: sending (to judge) | inclusion (ready for registry inclusion) | done (finalized / sent)

alter table judge_submissions
  add column if not exists notary_stage text not null default 'sending';

alter table judge_submissions
  add column if not exists notary_completed_at timestamptz;

create index if not exists idx_judge_submissions_notary_stage on judge_submissions(notary_stage);

