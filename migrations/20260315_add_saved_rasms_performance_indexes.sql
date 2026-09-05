create index if not exists idx_saved_rasms_notary_user_created_at
  on public.saved_rasms (notary_user_id, created_at desc);

create index if not exists idx_saved_rasms_notary_name_created_at
  on public.saved_rasms (notary_name, created_at desc);

create index if not exists idx_saved_rasms_notary_user_document_type_created_at
  on public.saved_rasms (notary_user_id, document_type, created_at desc);

create index if not exists idx_deed_attachments_record_type_record_id
  on public.deed_attachments (record_type, record_id);
