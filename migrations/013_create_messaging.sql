-- Messaging (Judge <-> Notary)
-- Purpose: Allow secure, audited messaging between authentication judge and notary users.

create extension if not exists "uuid-ossp";

create table if not exists message_threads (
  id uuid primary key default uuid_generate_v4(),

  judge_user_id uuid not null references users(id) on delete cascade,
  notary_user_id uuid not null references users(id) on delete cascade,
  -- Optional: identify a specific notary partner (adoul) within the notary's office
  notary_partner_id uuid references notary_partners(id) on delete set null,

  -- Convenience fields for listing threads efficiently
  last_message_at timestamptz,
  last_message_body text,
  last_message_sender_id uuid references users(id) on delete set null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Uniqueness:
-- - One "general" thread per judge+notary (partner NULL)
-- - One thread per judge+notary+partner when partner is set
create unique index if not exists uq_message_threads_general
  on message_threads(judge_user_id, notary_user_id)
  where notary_partner_id is null;

create unique index if not exists uq_message_threads_partner
  on message_threads(judge_user_id, notary_user_id, notary_partner_id)
  where notary_partner_id is not null;

create index if not exists idx_message_threads_judge on message_threads(judge_user_id);
create index if not exists idx_message_threads_notary on message_threads(notary_user_id);
create index if not exists idx_message_threads_last_message on message_threads(last_message_at desc nulls last);

-- Keep updated_at fresh
drop trigger if exists update_message_threads_updated_at on message_threads;
create trigger update_message_threads_updated_at before update on message_threads
  for each row execute function update_updated_at_column();

create table if not exists message_messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_user_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists idx_message_messages_thread on message_messages(thread_id);
create index if not exists idx_message_messages_thread_created on message_messages(thread_id, created_at desc);
create index if not exists idx_message_messages_unread on message_messages(thread_id, read_at) where read_at is null;

-- When a message is inserted, update the thread's "last message" fields
create or replace function update_message_thread_last_message()
returns trigger as $$
begin
  update message_threads
  set
    last_message_at = new.created_at,
    last_message_body = new.body,
    last_message_sender_id = new.sender_user_id
  where id = new.thread_id;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_message_messages_update_thread on message_messages;
create trigger trg_message_messages_update_thread
  after insert on message_messages
  for each row execute function update_message_thread_last_message();

