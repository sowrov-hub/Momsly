-- ==========================================================================
-- MOMSLY — stop users extending their own free trial
-- OPTIONAL. Run once in the Supabase SQL editor if you want it.
--
-- This does NOT touch how unlocking works. The access code is still
-- checked in upgrade.html and the browser still writes is_premium itself,
-- exactly as before — nothing to deploy, no Edge Function.
--
-- All this guards is trial_end. The client picks that value when it
-- inserts a profile at signup (js/auth.js), so without a guard someone
-- can hand themselves a trial ending in the year 3000 and never see the
-- upgrade screen. Afterwards the database decides trial length:
--
--   * INSERT from the browser → trial_end forced to now() + 3 days
--   * UPDATE from the browser → trial_end cannot move
--   * Direct SQL in the dashboard (no JWT) → allowed, so you can still
--     extend someone's trial by hand for a support case
--
-- KEEP THE 3 DAYS BELOW IN SYNC with TRIAL_DAYS in js/auth.js.
-- ==========================================================================

create or replace function public.guard_trial_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  claims json;
begin
  -- No JWT at all → direct SQL (dashboard/psql). Trusted, allow anything.
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::json;
  exception when others then
    claims := null;
  end;

  if claims is null then
    return new;
  end if;

  -- Edge Functions using the service role key. Trusted.
  if coalesce(claims ->> 'role', '') = 'service_role' then
    return new;
  end if;

  -- Everything else is the app running in someone's browser.
  if tg_op = 'INSERT' then
    new.trial_end := now() + interval '3 days';
  else
    new.trial_end := old.trial_end;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_trial_end on public.profiles;
create trigger trg_guard_trial_end
before insert or update on public.profiles
for each row execute procedure public.guard_trial_end();
