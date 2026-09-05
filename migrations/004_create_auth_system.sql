-- Authentication System Migration for Supabase
-- Created: December 2025
-- Purpose: User authentication with role-based access control

-- Ensure UUID extension is enabled (Supabase compatibility)
create extension if not exists "uuid-ossp";

-- User roles enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum (
      'government_authority',      -- السلطة الحكومية
      'national_notary_authority',  -- الهيئة الوطنية للعدول
      'authentication_judge',       -- القاضي المكلف بالتوثيق
      'notary'                      -- العدل (ONLY THIS ROLE CAN REGISTER PUBLICLY)
    );
  end if;
end $$;

-- Court types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'court_type') then
    create type court_type as enum (
      'appellate',      -- محكمة الاستئناف
      'first_instance'  -- المحكمة الابتدائية
    );
  end if;
end $$;

-- Users table
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  role user_role not null,
  full_name text not null,
  is_active boolean default true,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_login timestamptz
);

-- Add missing columns to existing users table
do $$
begin
  -- Add role column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'role') then
    alter table users add column role user_role not null default 'notary';
  end if;
  
  -- Add full_name column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'full_name') then
    alter table users add column full_name text not null default '';
  end if;
  
  -- Add is_verified column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'is_verified') then
    alter table users add column is_verified boolean default false;
  end if;
  
  -- Add last_login column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'last_login') then
    alter table users add column last_login timestamptz;
  end if;
end $$;

-- Add new columns to notary_profiles
do $$
begin
  -- Add appellate_court column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'notary_profiles' and column_name = 'appellate_court') then
    alter table notary_profiles add column appellate_court text;
  end if;
  
  -- Add primary_court column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'notary_profiles' and column_name = 'primary_court') then
    alter table notary_profiles add column primary_court text;
  end if;
end $$;

-- Notary-specific profile (for role = 'notary')
create table if not exists notary_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references users(id) on delete cascade,
  appointment_decree_number text not null,
  appellate_court text not null,        -- محكمة الاستئناف (always required)
  primary_court text,                   -- المحكمة الابتدائية (optional)
  court_type court_type not null,       -- For backward compatibility
  court_name text not null,             -- For backward compatibility
  phone text,
  office_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notary partners (up to 4 partners per notary)
create table if not exists notary_partners (
  id uuid primary key default uuid_generate_v4(),
  notary_profile_id uuid not null references notary_profiles(id) on delete cascade,
  partner_name text not null,
  contact_info text,
  position_order integer not null check (position_order between 1 and 4),
  created_at timestamptz default now()
);

-- Sessions table for secure session management
create table if not exists user_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  session_token text unique not null,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- Audit log for authentication events
create table if not exists auth_audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  email text,
  event_type text not null, -- login, logout, register, password_change, etc.
  ip_address text,
  user_agent text,
  success boolean not null,
  error_message text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_role on users(role);
create index if not exists idx_notary_profiles_user_id on notary_profiles(user_id);
create index if not exists idx_notary_partners_profile_id on notary_partners(notary_profile_id);
create index if not exists idx_user_sessions_token on user_sessions(session_token);
create index if not exists idx_user_sessions_user_id on user_sessions(user_id);
create index if not exists idx_user_sessions_expires on user_sessions(expires_at);
create index if not exists idx_auth_audit_user_id on auth_audit_log(user_id);
create index if not exists idx_auth_audit_created on auth_audit_log(created_at);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
drop trigger if exists update_users_updated_at on users;
create trigger update_users_updated_at before update on users
  for each row execute function update_updated_at_column();

drop trigger if exists update_notary_profiles_updated_at on notary_profiles;
create trigger update_notary_profiles_updated_at before update on notary_profiles
  for each row execute function update_updated_at_column();

-- Function to clean expired sessions
create or replace function cleanup_expired_sessions()
returns void as $$
begin
  delete from user_sessions where expires_at < now();
end;
$$ language plpgsql;

-- Comments for documentation
comment on table users is 'Main users table for authentication system';
comment on table notary_profiles is 'Extended profile information for notaries (العدول)';
comment on table notary_partners is 'Partners associated with each notary (up to 4)';
comment on table user_sessions is 'Active user sessions with secure tokens';
comment on table auth_audit_log is 'Audit trail for all authentication events';
