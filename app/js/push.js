/* ==========================================================================
   MOMSLY — WEB PUSH
   True background push notifications, layered ON TOP of the existing
   local reminder system (scheduler.js + notification.js), which keeps
   working completely unchanged as the in-app fallback (Levels 2-4 below).

   Notification delivery hierarchy:
     LEVEL 1 — Background Web Push (this file + the Edge Function),
               delivered by the OS even when Momsly is fully closed.
     LEVEL 2 — Service worker showNotification() while the browser is
               running (existing sw.js behavior, now also feeds push).
     LEVEL 3 — Existing local Notification API (notification.js).
     LEVEL 4 — Existing in-app toast fallback (notification.js).
   Every level already fails gracefully into the next; this file adds
   Level 1 without changing how Levels 2-4 behave.
   ========================================================================== */

// ==================================================
// MOMSLY WEB PUSH CONFIG
// ==================================================
// Public VAPID key — safe to expose in frontend code.
// Replace this placeholder with your real public key.
// Generate a pair with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

// VAPID PRIVATE KEY MUST NEVER BE STORED IN FRONTEND CODE.
// Store it as a Supabase Edge Function secret named:
// VAPID_PRIVATE_KEY

const Push = (() => {

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function isConfigured() {
    return isSupported() &&
      !!VAPID_PUBLIC_KEY && !VAPID_PUBLIC_KEY.includes('YOUR_VAPID_PUBLIC_KEY_HERE') &&
      SupabaseClient.isConfigured();
  }

  async function isSubscribed() {
    if (!isSupported()) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (e) {
      return false;
    }
  }

  // Subscribes this device to Web Push and saves the subscription in
  // Supabase under this device's anonymous session. Safe to call
  // repeatedly — reuses an existing subscription/session rather than
  // creating duplicates. Returns { ok, reason? } and never throws.
  async function subscribeToPush() {
    try {
      if (!isSupported()) return { ok: false, reason: 'unsupported' };
      if (!isConfigured()) return { ok: false, reason: 'not-configured' };

      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();
      if (permission !== 'granted') return { ok: false, reason: 'permission-denied' };

      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const user = await SupabaseClient.ensureAnonymousSession();
      if (!user) return { ok: false, reason: 'no-session' };

      const sb = SupabaseClient.get();
      const subJson = subscription.toJSON();
      const { error } = await sb.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      }, { onConflict: 'user_id,endpoint' });

      if (error) { console.warn('Saving push subscription failed', error); return { ok: false, reason: 'save-failed', error }; }
      return { ok: true, subscription };
    } catch (e) {
      console.warn('subscribeToPush failed', e);
      return { ok: false, reason: 'error', error: e };
    }
  }

  // Unsubscribes this device and deactivates its row in Supabase.
  // Fails gracefully — a Supabase/network error still leaves the device
  // unsubscribed locally, it just may not be cleaned up server-side yet.
  async function unsubscribeFromPush() {
    try {
      if (!isSupported()) return { ok: false, reason: 'unsupported' };
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return { ok: true, reason: 'not-subscribed' };

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const sb = SupabaseClient.get();
      if (sb) {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
          await sb.from('push_subscriptions').delete().eq('user_id', session.user.id).eq('endpoint', endpoint);
        }
      }
      return { ok: true };
    } catch (e) {
      console.warn('unsubscribeFromPush failed', e);
      return { ok: false, reason: 'error', error: e };
    }
  }

  function reminderBodyFor(r) {
    const bodies = {
      feeding: "It's about time for the next feed.",
      medicine: 'Time for medicine.',
      sleep: 'Time for nap or bedtime wind-down.',
      water: 'Quick water break.',
      health: 'Upcoming health reminder.',
      school: 'School reminder.',
      care: 'Care routine reminder.',
      custom: 'You asked to be reminded.',
    };
    return bodies[r.category] || 'Reminder from Momsly.';
  }

  // Mirrors one local reminder (from scheduler.js) to Supabase so the
  // GitHub Actions-triggered Edge Function can deliver it via push even
  // when Momsly is fully closed. Best-effort and silent — the existing
  // local reminder in localStorage is always the source of truth and
  // keeps working on its own regardless of whether this sync succeeds.
  async function syncReminderToServer(reminder) {
    if (!isConfigured()) return { ok: false, reason: 'not-configured' };
    try {
      const sb = SupabaseClient.get();
      const user = await SupabaseClient.ensureAnonymousSession();
      if (!sb || !user) return { ok: false, reason: 'no-session' };

      const payload = {
        user_id: user.id,
        local_id: reminder.id,
        type: reminder.category || 'custom',
        title: reminder.title,
        body: reminderBodyFor(reminder),
        icon: reminder.icon || 'bell',
        repeat: reminder.repeat,
        scheduled_for: reminder.repeat === 'interval' ? null : reminder.time,
        every_minutes: reminder.repeat === 'interval' ? reminder.every : null,
        status: reminder.enabled ? 'active' : 'paused',
      };

      const { error } = await sb.from('reminders').upsert(payload, { onConflict: 'user_id,local_id' });
      if (error) { console.warn('syncReminderToServer failed', error); return { ok: false, reason: 'save-failed', error }; }
      return { ok: true };
    } catch (e) {
      console.warn('syncReminderToServer error', e);
      return { ok: false, reason: 'error', error: e };
    }
  }

  async function removeReminderFromServer(localId) {
    if (!isConfigured()) return { ok: false, reason: 'not-configured' };
    try {
      const sb = SupabaseClient.get();
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.user) return { ok: false, reason: 'no-session' };
      const { error } = await sb.from('reminders').delete().eq('user_id', session.user.id).eq('local_id', localId);
      if (error) return { ok: false, reason: 'delete-failed', error };
      return { ok: true };
    } catch (e) {
      console.warn('removeReminderFromServer error', e);
      return { ok: false, reason: 'error', error: e };
    }
  }

  return {
    isSupported, isConfigured, isSubscribed,
    subscribeToPush, unsubscribeFromPush,
    syncReminderToServer, removeReminderFromServer,
    urlBase64ToUint8Array,
  };
})();
