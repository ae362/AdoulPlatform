-- Income report versioning (audit-ready)
-- Created: Jan 2026
-- Purpose: Keep immutable versions of each regional income report for full auditability.

create extension if not exists "uuid-ossp";

create table if not exists regional_income_report_versions (
  id uuid primary key default uuid_generate_v4(),
  income_report_id uuid not null references regional_income_reports(id) on delete cascade,
  version int not null,
  payload jsonb not null,
  created_by uuid null references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (income_report_id, version)
);

create index if not exists regional_income_report_versions_report_idx on regional_income_report_versions (income_report_id, version desc);
create index if not exists regional_income_report_versions_created_at_idx on regional_income_report_versions (created_at desc);
