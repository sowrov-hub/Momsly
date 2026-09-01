-- ==========================================================================
-- MOMSLY — shorten the free trial from 7 days to 3 days
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → Run).
--
-- Context: profiles.trial_end is written by the app at signup
-- (js/auth.js → TRIAL_DAYS), NOT by a database default or trigger.
-- So NEW signups already get 3 days from the app change alone — this
-- file only fixes rows that were created while the trial was 7 days.
--
-- Safety rules baked in:
--   * least(...) means a trial can only ever be shortened, never extended,
--     so this is safe to run more than once.
--   * Premium accounts are skipped entirely.
-- ==========================================================================

update public.profiles
set    trial_end  = least(trial_end, created_at + interval '3 days'),
       updated_at = now()
where  is_premium is not true
  and  trial_end is not null
  and  trial_end > created_at + interval '3 days';
