-- ==========================================================================
-- MOMSLY — run the push scheduler inside Supabase instead of GitHub Actions
--
-- WHY
-- Background reminders were arriving late. They were triggered by the
-- GitHub Actions workflow in .github/workflows/momsly-push-scheduler.yml,
-- and GitHub's `schedule` event is explicitly best-effort: scheduled runs
-- sit at the lowest queue priority and get delayed under load, routinely
-- by 10-40 minutes on the free tier. A "*/5" cron there is a suggestion,
-- not a promise.
--
-- pg_cron runs inside your own Postgres instance, so it actually fires on
-- time, and it can run every minute instead of every five.
--
-- BEFORE RUNNING
-- Dashboard → Database → Extensions → enable BOTH:
--     pg_cron    (the scheduler)
--     pg_net     (lets Postgres make the HTTP call)
--
-- Then replace the two placeholders below:
--     PASTE_YOUR_ANON_KEY      Project Settings → API → anon/public key
--     PASTE_YOUR_CRON_SECRET   the same value as the CRON_SECRET Edge
--                              Function secret (Edge Functions → Secrets).
--                              This is what stops strangers triggering
--                              your sends — the function URL is public.
--
-- Safe to re-run: the unschedule below clears any previous copy first.
-- ==========================================================================

-- Remove a previous version of this job, if any, so re-running this file
-- doesn't leave two jobs firing the same notifications twice.
select cron.unschedule('momsly-push-scheduler')
where exists (
  select 1 from cron.job where jobname = 'momsly-push-scheduler'
);

select cron.schedule(
  'momsly-push-scheduler',
  '* * * * *',          -- every minute; was every 5 on GitHub, when it felt like it
  $$
  select net.http_post(
    url     := 'https://lsbhqapudspqrnhjyujk.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'Authorization',  'Bearer PASTE_YOUR_ANON_KEY',
      'x-cron-secret',  'PASTE_YOUR_CRON_SECRET'
    ),
    body    := '{}'::jsonb
  );
  $$
);


-- --------------------------------------------------------------------------
-- CHECKING IT WORKS
--
-- Is the job registered and active?
--     select jobname, schedule, active from cron.job;
--
-- Did the last few runs succeed? (should be one row per minute)
--     select start_time, status, return_message
--     from cron.job_run_details
--     where jobid = (select jobid from cron.job where jobname = 'momsly-push-scheduler')
--     order by start_time desc limit 10;
--
-- `status = 'succeeded'` here only means Postgres fired the HTTP request.
-- To see what the Edge Function itself replied:
--     select id, created, status_code, content
--     from net._http_response order by created desc limit 10;
-- A 401 there means the anon key or cron secret above is wrong.
--
--
-- TURNING IT OFF AGAIN
--     select cron.unschedule('momsly-push-scheduler');
-- --------------------------------------------------------------------------
