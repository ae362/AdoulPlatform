create table if not exists marriage_documents (
  id uuid primary key default uuid_generate_v4(),
  marriage_record_id uuid not null references marriage_records(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  storage_path text not null,
  file_type text,
  file_size integer,
  subject text,
  ocr_raw_text text,
  ocr_detected_fields jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_marriage_documents_record on marriage_documents (marriage_record_id);
