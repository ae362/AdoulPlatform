-- Add husband_previous_divorce_ref to marriage_records
alter table marriage_records
add column if not exists husband_previous_divorce_ref text;
