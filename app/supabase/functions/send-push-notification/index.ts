// ==========================================================================
// MOMSLY — send-push-notification (Supabase Edge Function)
//
// Triggered on a schedule by the GitHub Actions workflow in
// .github/workflows/momsly-push-scheduler.yml (every 5 minutes). Each run:
//   1. Finds reminders that are due right now, across all users.
//   2. Looks up each due reminder's owner's push subscription(s).
//   3. Sends a Web Push notification to each subscription.
//   4. Removes subscriptions the push service reports as expired/invalid.
//   5. Updates last_fired_at / status on the reminder, same rules as the
//      client-side scheduler.js, so it won't fire again until it's next due.
//
// This function uses the SERVICE ROLE key (bypasses RLS by design — it
// must read every user's due reminders and subscriptions). The service
// role key lives ONLY in Supabase Edge Function secrets, never in
// frontend code.
// ==========================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('PROJECT_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@example.com';
// Shared secret this function checks against the x-cron-secret header,
// so only your GitHub Actions workflow (which knows the secret) can
// trigger sends — the anon/service key alone isn't enough of a gate
// since the function URL itself is publicly reachable.
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function isDue(reminder: any, now: Date): boolean {
  if (reminder.status !== 'active') return false;

  if (reminder.repeat === 'once') {
    if (reminder.last_fired_at) return false;
    return !!reminder.scheduled_for && new Date(reminder.scheduled_for) <= now;
  }

  if (reminder.repeat === 'daily') {
    if (!reminder.scheduled_for) return false;
    const t = new Date(reminder.scheduled_for);
    const todayTargetUTC = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
      t.getUTCHours(), t.getUTCMinutes(), 0, 0
    ));
    const firedToday = reminder.last_fired_at && isSameUTCDate(new Date(reminder.last_fired_at), now);
    return !firedToday && now >= todayTargetUTC;
  }

  if (reminder.repeat === 'interval') {
    const base = reminder.last_fired_at ? new Date(reminder.last_fired_at) : new Date(reminder.created_at);
    const everyMs = (reminder.every_minutes || 60) * 60000;
    const next = new Date(base.getTime() + everyMs);
    return now >= next;
  }

  return false;
}

function isSameUTCDate(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();
}

Deno.serve(async (req: Request) => {
  try {
    if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    const now = new Date();

    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .eq('status', 'active');

    if (remindersError) throw remindersError;

    const dueReminders = (reminders || []).filter((r) => isDue(r, now));

    let sent = 0;
    let removedSubscriptions = 0;
    const errors: string[] = [];

    for (const reminder of dueReminders) {
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', reminder.user_id);

      if (subError) { errors.push(`sub lookup failed for reminder ${reminder.id}: ${subError.message}`); continue; }
      if (!subscriptions || subscriptions.length === 0) continue;

      const payload = JSON.stringify({
        title: reminder.title,
        body: reminder.body,
        icon: '/assets/icons/icon-192.png',
        tag: `momsly-reminder-${reminder.local_id}`,
        url: '/app/',
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent++;
        } catch (err: any) {
          // 404/410 = the push service says this subscription is gone
          // (user uninstalled, cleared data, etc.) — clean it up so we
          // stop trying it.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            removedSubscriptions++;
          } else {
            errors.push(`push failed for subscription ${sub.id}: ${err?.message || err}`);
          }
        }
      }

      // Mirror the exact same "mark as fired" rules scheduler.js uses
      // client-side, so once/daily/interval semantics stay consistent
      // whether a reminder fires locally or via background push.
      await supabase.from('reminders').update({ last_fired_at: now.toISOString() }).eq('id', reminder.id);
    }

    return new Response(JSON.stringify({
      ok: true,
      checked: reminders?.length || 0,
      due: dueReminders.length,
      sent,
      removedSubscriptions,
      errors,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('send-push-notification failed', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }), { status: 500 });
  }
});
