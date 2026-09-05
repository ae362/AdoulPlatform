alter table copy_requests add column if not exists primary_court text;
alter table copy_requests add column if not exists record_year integer;
alter table copy_requests add column if not exists record_details jsonb;
alter table copy_requests add column if not exists assigned_notary_ids uuid[];
alter table copy_requests add column if not exists routing_mode text;

create index if not exists idx_copy_requests_assigned_notaries
  on copy_requests using gin (assigned_notary_ids);