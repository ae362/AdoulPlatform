create table if not exists public.judge_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  appellate_court text,
  primary_court text,
  court_name text,
  phone text,
  profile_picture_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_judge_profiles_court_name
  on public.judge_profiles (court_name);

create index if not exists idx_judge_profiles_appellate_court
  on public.judge_profiles (appellate_court);
