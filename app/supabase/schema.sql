-- ==========================================================================
-- MOMSLY — WEB PUSH SQL SCHEMA
-- Run this once in Supabase Dashboard → SQL Editor (or via the CLI).
--
-- Ownership model: rows are scoped to auth.uid() from an ANONYMOUS
-- Supabase auth session created silently per device (see
-- js/supabase-client.js). This is completely separate from Momsly's own
-- local email/password login — no real user accounts are created here.
--
-- Prerequisite (manual dashboard step, cannot be done via SQL):
--   Authentication → Settings → enable "Allow anonymous sign-ins"
-- ==========================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- push_subscriptions
-- --------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- reminders  (server-side mirror of the local reminder, used only to
-- know what/when to push — the local copy in localStorage stays the
-- source of truth for the in-app experience)
-- --------------------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,          -- ties back to the localStorage reminder id
  type text not null default 'custom',
  title text not null,
  body text not null default '',
  icon text default 'bell',
  repeat text not null default 'once',   -- 'once' | 'daily' | 'interval'
  scheduled_for timestamptz,             -- used by 'once' and 'daily'
  every_minutes integer,                 -- used by 'interval'
  last_fired_at timestamptz,
  status text not null default 'active', -- 'active' | 'paused'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

alter table public.reminders enable row level security;

drop policy if exists "reminders_select_own" on public.reminders;
create policy "reminders_select_own"
  on public.reminders for select
  using (auth.uid() = user_id);

drop policy if exists "reminders_insert_own" on public.reminders;
create policy "reminders_insert_own"
  on public.reminders for insert
  with check (auth.uid() = user_id);

drop policy if exists "reminders_update_own" on public.reminders;
create policy "reminders_update_own"
  on public.reminders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_delete_own"
  on public.reminders for delete
  using (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- auto-touch updated_at on both tables
-- --------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_reminders_updated_at on public.reminders;
create trigger trg_reminders_updated_at
before update on public.reminders
for each row execute procedure public.set_updated_at();
