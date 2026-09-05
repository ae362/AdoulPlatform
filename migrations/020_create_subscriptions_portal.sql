-- Subscriptions / Donations / Stamps / Receipts portal

create table if not exists subscription_payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  subscription_type text not null check (subscription_type in ('yearly', 'monthly')),
  period_year int not null,
  period_month int null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'MAD',
  due_date date not null,
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_payments_user_year_idx on subscription_payments (user_id, period_year);
create index if not exists subscription_payments_user_due_idx on subscription_payments (user_id, due_date);

create table if not exists donations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  scope text not null check (scope in ('جهوي', 'وطني')),
  category text null,
  amount numeric(12,2) not null default 0,
  donated_at timestamptz not null default now(),
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists donations_user_donated_idx on donations (user_id, donated_at desc);

create table if not exists stamp_purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  stamp_name text not null,
  quantity int not null default 1,
  unit_price numeric(12,2) not null default 0,
  purchased_at timestamptz not null default now(),
  integration_ref text null,
  created_at timestamptz not null default now()
);

create index if not exists stamp_purchases_user_purchased_idx on stamp_purchases (user_id, purchased_at desc);

create table if not exists payment_receipts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('subscription', 'donation', 'stamps', 'other')),
  related_id uuid null,
  receipt_number text null,
  file_url text null,
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists payment_receipts_user_created_idx on payment_receipts (user_id, created_at desc);

