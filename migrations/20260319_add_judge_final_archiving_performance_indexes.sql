create index if not exists idx_judge_submissions_status_updated_file
  on public.judge_submissions (status, updated_at desc, file_number);

create index if not exists idx_judge_submissions_file_updated
  on public.judge_submissions (file_number, updated_at desc);

create index if not exists idx_archive_operation_logs_action_signed_timestamp
  on public.archive_operation_logs (action_type, signed_deed_id, timestamp desc);

create index if not exists idx_archive_operation_logs_action_timestamp
  on public.archive_operation_logs (action_type, timestamp desc);

create index if not exists idx_deed_attachments_record_category_created
  on public.deed_attachments (record_type, category, record_id, created_at desc);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'final_secure_archives'
  ) then
    execute 'create index if not exists idx_final_secure_archives_signed_stage
      on public.final_secure_archives (signed_deed_id, current_stage)';
  end if;
end $$;
