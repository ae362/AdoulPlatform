alter table if exists marriage_records
  add column if not exists document_url text,
  add column if not exists document_name text;

alter table if exists divorce_records
  add column if not exists document_url text,
  add column if not exists document_name text;

alter table if exists property_fees
  add column if not exists document_url text,
  add column if not exists document_name text;

alter table if exists inheritance_fees
  add column if not exists document_url text,
  add column if not exists document_name text;

alter table if exists other_document_fees
  add column if not exists document_url text,
  add column if not exists document_name text;
