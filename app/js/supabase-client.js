/* ==========================================================================
   MOMSLY — SUPABASE CLIENT
   Used ONLY for Web Push delivery (push subscriptions + server-synced
   reminders so a scheduled job can deliver notifications even when the
   app is fully closed). This is completely separate from Momsly's own
   local email/password auth, 7-day trial, and premium system in auth.js
   — none of that is touched, replaced, or routed through Supabase.

   The "sign-in" used here is Supabase Anonymous Auth: an invisible,
   no-credentials session created silently in the background purely so
   Supabase's row-level security has a real auth.uid() to scope this
   device's push subscription and reminders to. The user never sees or
   interacts with it — Momsly's own login screen is unaffected.
   ========================================================================== */

// ==================================================
// MOMSLY SUPABASE CONFIG
// ==================================================
// Replace these two placeholders with your real project values from
// Supabase Dashboard → Project Settings → API.
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
// The anon key is safe to expose in frontend code by design (it only
// works within your RLS policies). Never put a service_role key here.

const SupabaseClient = (() => {
  let client = null;
  let sessionPromise = null;

  function isConfigured() {
    return !!SUPABASE_URL && !!SUPABASE_ANON_KEY &&
      !SUPABASE_URL.includes('YOUR_SUPABASE_URL_HERE') &&
      !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY_HERE');
  }

  function get() {
    if (!isConfigured()) return null;
    if (!client) {
      if (!window.supabase || !window.supabase.createClient) {
        console.warn('Supabase JS library not loaded — push features unavailable.');
        return null;
      }
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  // Ensures this device has an anonymous Supabase auth session, creating
  // one on first use and reusing it afterwards. Never throws — callers
  // should treat a null return as "push sync unavailable right now" and
  // fall back gracefully, exactly like every other Push/SupabaseClient call.
  async function ensureAnonymousSession() {
    const sb = get();
    if (!sb) return null;
    if (!sessionPromise) {
      sessionPromise = (async () => {
        try {
          const { data: { session } } = await sb.auth.getSession();
          if (session?.user) return session.user;
          const { data, error } = await sb.auth.signInAnonymously();
          if (error) { console.warn('Supabase anonymous sign-in failed', error); return null; }
          return data.user;
        } catch (e) {
          console.warn('Supabase anonymous sign-in error', e);
          return null;
        }
      })();
    }
    return sessionPromise;
  }

  return { get, isConfigured, ensureAnonymousSession };
})();
