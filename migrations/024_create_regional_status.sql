-- Regional Status (National Dashboard)
-- Created: Jan 2026
-- Purpose: Store regional council documents, governance/status snapshots, and structured notes
-- to power the "الوضع الجهوي" dashboard.

create extension if not exists "uuid-ossp";

create table if not exists regional_council_documents (
  id uuid primary key default uuid_generate_v4(),
  council_user_id uuid not null references users(id) on delete cascade,
  region_code text null,
  kind text not null check (kind in (
    'financial_report',
    'meeting_minutes',
    'training',
    'governance_report',
    'communication',
    'solidarity',
    'legal_activity',
    'other'
  )),
  title text not null,
  tags text[] null,
  report_year int null,

  file_name text not null,
  file_url text not null,
  file_path text null,
  mime_type text null,
  size_bytes int null,

  ocr_text text null,
  meta jsonb null,

  uploaded_by uuid null references users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists regional_council_documents_council_idx on regional_council_documents (council_user_id);
create index if not exists regional_council_documents_kind_idx on regional_council_documents (kind);
create index if not exists regional_council_documents_year_idx on regional_council_documents (report_year);
create index if not exists regional_council_documents_uploaded_at_idx on regional_council_documents (uploaded_at desc);

create table if not exists regional_council_status_snapshots (
  id uuid primary key default uuid_generate_v4(),
  council_user_id uuid not null references users(id) on delete cascade,
  report_year int not null,
  payload jsonb not null,
  created_by uuid null references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (council_user_id, report_year)
);

create index if not exists regional_council_status_snapshots_year_idx on regional_council_status_snapshots (report_year);
