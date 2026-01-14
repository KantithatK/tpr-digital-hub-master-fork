-- Create tables to track login events and daily presence

-- Event-level login logs
create table if not exists public.user_login_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  logged_in_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  platform text,
  success boolean not null default true
);

-- One row per user per day indicating they logged in that day
create table if not exists public.user_daily_logins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  login_date date not null,
  first_login_at timestamptz not null default now(),
  constraint user_daily_logins_user_date_unique unique (user_id, login_date)
);

-- Helpful indexes
create index if not exists idx_user_login_logs_user_time on public.user_login_logs (user_id, logged_in_at desc);
create index if not exists idx_user_daily_logins_user_date on public.user_daily_logins (user_id, login_date);

-- If using RLS, enable and add simple policies (commented out by default)
-- alter table public.user_login_logs enable row level security;
-- alter table public.user_daily_logins enable row level security;
--
-- create policy "users can insert their own login logs" on public.user_login_logs
--   for insert
--   to authenticated
--   with check (auth.uid() = user_id);
--
-- create policy "admins can read all logs" on public.user_login_logs
--   for select
--   to authenticated
--   using (true);
--
-- create policy "users can upsert their daily login" on public.user_daily_logins
--   for insert
--   to authenticated
--   with check (auth.uid() = user_id);
--
-- create policy "admins can read daily logins" on public.user_daily_logins
--   for select
--   to authenticated
--   using (true);
