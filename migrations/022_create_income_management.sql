-- Income Management (National / Regional) 
-- Created: Jan 2026
-- Purpose: Track regional income basis, 10% national contribution, transfers, reconciliation, supporting documents, approvals, audit trail, and year closing.

create extension if not exists "uuid-ossp";

-- Regional council profile (metadata used for reporting)
create table if not exists regional_council_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  council_name text not null,
  region_code text null,
  notaries_count int null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists regional_council_profiles_name_idx on regional_council_profiles (council_name);

-- Income reports from regional councils (monthly / quarterly / annual)
create table if not exists regional_income_reports (
  id uuid primary key default uuid_generate_v4(),
  council_user_id uuid not null references users(id) on delete cascade,
  report_year int not null,
  granularity text not null check (granularity in ('monthly', 'quarterly', 'annual')),
  report_month int null check (report_month between 1 and 12),
  report_quarter int null check (report_quarter between 1 and 4),
  total_income numeric(14,2) not null default 0,
  contribution_rate numeric(6,4) not null default 0.10,
  due_amount numeric(14,2) not null default 0,
  due_date date null,
  note text null,
  submitted_by uuid null references users(id) on delete set null,
  submitted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (council_user_id, report_year, granularity, report_month, report_quarter)
);

create index if not exists regional_income_reports_year_idx on regional_income_reports (report_year, granularity);
create index if not exists regional_income_reports_council_year_idx on regional_income_reports (council_user_id, report_year);

-- Transfers linked to income reports (reconciliation + approvals)
create table if not exists regional_income_transfers (
  id uuid primary key default uuid_generate_v4(),
  income_report_id uuid not null references regional_income_reports(id) on delete cascade,
  transferred_amount numeric(14,2) not null default 0,
  transferred_at date not null,
  bank_ref text null,
  approval_status text not null default 'draft' check (approval_status in ('draft', 'submitted', 'approved', 'rejected')),
  regional_approved_by uuid null references users(id) on delete set null,
  regional_approved_at timestamptz null,
  national_approved_by uuid null references users(id) on delete set null,
  national_approved_at timestamptz null,
  rejection_reason text null,
  created_by uuid null references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists regional_income_transfers_report_idx on regional_income_transfers (income_report_id);
create index if not exists regional_income_transfers_status_idx on regional_income_transfers (approval_status);
create index if not exists regional_income_transfers_date_idx on regional_income_transfers (transferred_at desc);

-- Supporting documents for transfers (bank receipt, report, minutes, etc.)
create table if not exists income_supporting_documents (
  id uuid primary key default uuid_generate_v4(),
  transfer_id uuid not null references regional_income_transfers(id) on delete cascade,
  kind text not null check (kind in ('bank_receipt', 'regional_financial_report', 'meeting_minutes', 'other')),
  file_name text not null,
  file_url text not null,
  file_path text null,
  mime_type text null,
  size_bytes int null,
  uploaded_by uuid null references users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists income_supporting_documents_transfer_idx on income_supporting_documents (transfer_id);

-- Audit log for income operations (audit-ready)
create table if not exists income_audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_user_id uuid null references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  meta jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists income_audit_log_created_idx on income_audit_log (created_at desc);
create index if not exists income_audit_log_entity_idx on income_audit_log (entity_type, entity_id);

-- Year closing mechanism to lock reporting periods
create table if not exists income_year_closings (
  report_year int primary key,
  closed_by uuid null references users(id) on delete set null,
  closed_at timestamptz not null default now(),
  note text null
);
