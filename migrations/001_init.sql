create extension if not exists "uuid-ossp";

create table if not exists notaries (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  cin text,
  appointment_number text,
  start_date date,
  office_location text,
  region text,
  phone text,
  email text,
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists stored_documents (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  path text not null,
  mime_type text,
  size integer,
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists marriage_records (
  id uuid primary key default uuid_generate_v4(),
  record_type text,
  fee_type text,
  inclusion_date date,
  inclusion_hijri text,
  husband_name text,
  husband_cin text,
  husband_birth_date date,
  husband_nationality text,
  husband_is_muslim boolean,
  husband_marital_status text,
  husband_residence text,
  wife_name text,
  wife_cin text,
  wife_birth_date date,
  wife_nationality text,
  wife_is_muslim boolean,
  wife_marital_status text,
  wife_residence text,
  is_minor_husband boolean,
  is_minor_wife boolean,
  minor_husband_permit_file_no text,
  minor_wife_permit_file_no text,
  mixed_marriage_husband_passport_no text,
  mixed_marriage_wife_passport_no text,
  husband_disability_type text,
  wife_disability_type text,
  marriage_authorization_no text,
  dowry_amount numeric,
  investment_of_assets_agreed boolean,
  contracted_by text,
  registry_book_type text,
  registry_number integer,
  registry_count integer,
  registry_letter text,
  registry_page integer,
  source_document_ref text,
  document_url text,
  document_name text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists divorce_records (
  id uuid primary key default uuid_generate_v4(),
  divorce_type text,
  fee_type text,
  inclusion_date date,
  inclusion_hijri text,
  husband_name text,
  husband_cin text,
  wife_name text,
  wife_cin text,
  judgment_number text,
  divorce_witnessing_date date,
  marriage_registry_number text,
  marriage_registry_count integer,
  marriage_registry_page integer,
  divorce_registry_book_type text,
  divorce_registry_number integer,
  divorce_registry_count integer,
  divorce_registry_letter text,
  divorce_registry_page integer,
  husband_birth_date date,
  wife_birth_date date,
  occupations text,
  nationality text,
  number_of_children integer,
  cohabiting boolean,
  document_url text,
  document_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists property_fees (
  id uuid primary key default uuid_generate_v4(),
  fee_type text,
  inclusion_date date,
  inclusion_hijri text,
  parties_names text,
  parties_cin text,
  transferor_name text,
  registration_and_stamp_ref text,
  property_coordinates text,
  registry_book_type text,
  registry_number integer,
  registry_count integer,
  registry_letter text,
  registry_page integer,
  source_document_ref text,
  document_url text,
  document_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists inheritance_fees (
  id uuid primary key default uuid_generate_v4(),
  fee_type text,
  inclusion_date date,
  inclusion_hijri text,
  deceased_name text,
  heirs_names text,
  applicants_cin text,
  document_references text,
  registry_book_type text,
  registry_number integer,
  registry_count integer,
  registry_letter text,
  registry_page integer,
  document_url text,
  document_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists other_document_fees (
  id uuid primary key default uuid_generate_v4(),
  fee_type text,
  inclusion_date date,
  inclusion_hijri text,
  applicants_names text,
  applicants_cin text,
  document_refs text,
  is_in_inheritance_registry boolean,
  registry_number integer,
  registry_count integer,
  registry_page integer,
  document_url text,
  document_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists copy_requests (
  id uuid primary key default uuid_generate_v4(),
  record_type text,
  reference_ids uuid[],
  requester_name text,
  requester_cin text,
  request_date date,
  status text default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contracts (
  id uuid primary key default uuid_generate_v4(),
  contract_type text,
  title text,
  body text,
  ai_notes text,
  legal_review jsonb,
  storage_document_id uuid references stored_documents(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists statistics_snapshots (
  id uuid primary key default uuid_generate_v4(),
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists legal_checks (
  id uuid primary key default uuid_generate_v4(),
  record_type text,
  payload jsonb,
  result jsonb,
  created_at timestamptz default now()
);

create table if not exists general_files (
  id uuid primary key default uuid_generate_v4(),
  title text,
  description text,
  storage_document_id uuid references stored_documents(id),
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists persons (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  cin text,
  birth_date date,
  nationality text,
  occupation text,
  address text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contract_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  template_type text,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists registration_stamps (
  id uuid primary key default uuid_generate_v4(),
  record_type text not null,
  record_id uuid not null,
  registration_number text,
  tax_value numeric,
  paid_date date,
  office text,
  receipt_ref text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_marriage_cin on marriage_records (husband_cin, wife_cin);
create index if not exists idx_divorce_cin on divorce_records (husband_cin, wife_cin);
create index if not exists idx_property_cin on property_fees (parties_cin);
create index if not exists idx_copy_requests_cin on copy_requests (requester_cin);
create index if not exists idx_registration_record on registration_stamps (record_type, record_id);
create index if not exists idx_dates_marriage on marriage_records (inclusion_date);
create index if not exists idx_dates_divorce on divorce_records (inclusion_date);
create index if not exists idx_dates_property on property_fees (inclusion_date);
