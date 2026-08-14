-- ==========================================================================
-- MOMSLY — SQL SCHEMA
-- Run this once in Supabase Dashboard → SQL Editor (or via the CLI).
--
-- Ownership model: rows are scoped to auth.uid() from a REAL Supabase
-- Auth session (email/password signup or login via js/auth.js). This is
-- Momsly's actual account system — the same login works across devices.
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

-- ==========================================================================
-- MOMSLY — AUTH MIGRATION: profiles table
-- Added when Momsly moved from local/device-only fake accounts to real
-- Supabase Auth (email/password), for genuine cross-device login.
--
-- auth.users (built into Supabase Auth) only holds login credentials —
-- it has no columns for app-specific fields like display name, trial
-- start date, or premium status. This table holds exactly those, keyed
-- 1:1 to the real authenticated user, so trial/premium status is now
-- tied to the ACCOUNT (works across devices) instead of the browser.
--
-- Row is created client-side (see js/auth.js) right after a successful
-- signup or first login — there is no database trigger for this, so it
-- stays visible and inspectable in application code.
-- ==========================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  trial_started_at timestamptz,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- MIGRATION: reconcile & remove a legacy `premium` column
--
-- Some profile rows ended up with BOTH `premium` and `is_premium` columns,
-- and they drifted out of sync (one true, one false) for at least one
-- real user. `is_premium` is the only column the app code reads or
-- writes — `premium` was never created by this schema and isn't
-- referenced anywhere in the app, so nothing can keep it in sync once
-- it exists. This block is safe to run any number of times: it only
-- acts if a `premium` column is actually present.
--
-- Rule: if EITHER column says premium, the account keeps premium — a
-- paying user must never be downgraded by a column-naming mismatch.
-- --------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'premium'
  ) then
    update public.profiles
    set is_premium = true
    where premium = true and is_premium is distinct from true;

    alter table public.profiles drop column premium;
  end if;
end $$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();
