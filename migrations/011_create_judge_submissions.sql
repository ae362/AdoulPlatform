-- Judge Submissions (Notary -> Authentication Judge)
-- Purpose: Allow notaries to submit deeds/fees to a judge for review and endorsement.

create extension if not exists "uuid-ossp";

create table if not exists judge_submissions (
  id uuid primary key default uuid_generate_v4(),

  -- Notary info
  notary_user_id uuid not null references users(id) on delete cascade,
  notary_name text not null,

  -- Submission metadata
  file_number text,
  document_type text,
  summary text,

  -- Main payload (JSON-safe subset of FeesAgent state)
  payload jsonb not null default '{}'::jsonb,

  -- Workflow
  status text not null default 'pending', -- pending | in_review | accepted | accepted_with_notes | substantive_notes
  decision text, -- accepted | accepted_with_notes | substantive_notes
  judge_user_id uuid references users(id) on delete set null,
  judge_notes text,
  decided_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_judge_submissions_notary on judge_submissions(notary_user_id);
create index if not exists idx_judge_submissions_status on judge_submissions(status);
create index if not exists idx_judge_submissions_created on judge_submissions(created_at desc);

-- Keep updated_at fresh
drop trigger if exists update_judge_submissions_updated_at on judge_submissions;
create trigger update_judge_submissions_updated_at before update on judge_submissions
  for each row execute function update_updated_at_column();

