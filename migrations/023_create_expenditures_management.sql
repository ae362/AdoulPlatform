-- Expenditures Management (National / Regional Requests)
-- Created: Jan 2026
-- Purpose: Track national spending operations with governance taxonomy, approvals workflow,
-- supporting documents, audit trail, conflict checks, budgets linkage, and year closing.

create extension if not exists "uuid-ossp";

-- Budget lines (annual allocations per spending nature/category)
create table if not exists national_budget_lines (
  id uuid primary key default uuid_generate_v4(),
  report_year int not null,
  spending_nature text not null,
  allocated_amount numeric(14,2) not null default 0,
  ceiling_amount numeric(14,2) null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_year, spending_nature)
);

create index if not exists national_budget_lines_year_idx on national_budget_lines (report_year);

-- Expenditure operations
create table if not exists national_expenditures (
  id uuid primary key default uuid_generate_v4(),
  operation_number text not null,
  payment_date date not null,
  payer_entity text not null,
  beneficiary_entity text not null,

  -- Taxonomy
  spending_nature text not null check (
    spending_nature in (
      'operating',
      'capex',
      'training',
      'professional_activities',
      'meetings_conferences',
      'travel_accommodation',
      'it_digital',
      'legal_studies',
      'professional_services',
      'maintenance',
      'reserves_compensation',
      'professional_solidarity'
    )
  ),
  spending_subtype text null,
  time_granularity text not null check (time_granularity in ('annual', 'quarterly', 'monthly', 'weekly', 'on_demand')),
  influencing_body text not null check (influencing_body in ('executive_office', 'regional_council', 'standing_committee', 'presidency', 'general_administration')),

  -- Documents / payment
  document_type text not null check (document_type in ('invoice', 'contract', 'receipt', 'payment_order', 'other')),
  document_reference text null,
  payment_method text not null check (payment_method in ('transfer', 'check', 'cash', 'professional_account')),

  -- Workflow
  status text not null default 'draft' check (status in ('draft', 'under_review', 'accepted', 'rejected', 'deferred')),
  reviewed_by uuid null references users(id) on delete set null,
  reviewed_at timestamptz null,
  review_notes text null,

  -- Amount
  amount numeric(14,2) not null default 0,
  currency text not null default 'MAD',

  -- Links
  budget_line_id uuid null references national_budget_lines(id) on delete set null,
  performance_report_ref text null,
  legal_notes text null,
  controlling_entity text null,
  payment_order_ref text null,

  -- Ownership / provenance
  created_by uuid null references users(id) on delete set null,
  council_user_id uuid null references users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (operation_number)
);

create index if not exists national_expenditures_year_idx on national_expenditures (date_part('year', payment_date));
create index if not exists national_expenditures_payment_date_idx on national_expenditures (payment_date desc);
create index if not exists national_expenditures_status_idx on national_expenditures (status);
create index if not exists national_expenditures_nature_idx on national_expenditures (spending_nature);
create index if not exists national_expenditures_body_idx on national_expenditures (influencing_body);

-- Supporting documents for expenditures
create table if not exists expenditure_supporting_documents (
  id uuid primary key default uuid_generate_v4(),
  expenditure_id uuid not null references national_expenditures(id) on delete cascade,
  kind text not null check (kind in ('invoice', 'contract', 'receipt', 'payment_order', 'other')),
  file_name text not null,
  file_url text not null,
  file_path text null,
  mime_type text null,
  size_bytes int null,
  uploaded_by uuid null references users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists expenditure_supporting_documents_exp_idx on expenditure_supporting_documents (expenditure_id);

-- Audit log
create table if not exists expenditures_audit_log (
  id bigserial primary key,
  actor_user_id uuid null references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text null,
  meta jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists expenditures_audit_log_created_idx on expenditures_audit_log (created_at desc);

-- Conflict checks / anomalies
create table if not exists expenditures_conflicts (
  id uuid primary key default uuid_generate_v4(),
  expenditure_id uuid not null references national_expenditures(id) on delete cascade,
  conflict_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  details jsonb null,
  resolved boolean not null default false,
  resolved_by uuid null references users(id) on delete set null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists expenditures_conflicts_exp_idx on expenditures_conflicts (expenditure_id);
create index if not exists expenditures_conflicts_resolved_idx on expenditures_conflicts (resolved);

-- Year closing locks
create table if not exists expenditures_year_closings (
  report_year int primary key,
  closed_by uuid null references users(id) on delete set null,
  closed_at timestamptz not null default now(),
  note text null
);
