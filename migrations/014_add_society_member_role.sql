-- Add society_member role for Society Members Portal
-- This keeps existing roles intact and simply extends the enum.

do $$
begin
  if exists (select 1 from pg_type where typname = 'user_role') then
    alter type user_role add value if not exists 'society_member';
  end if;
end $$;

