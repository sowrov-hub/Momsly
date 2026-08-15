/* ==========================================================================
   MOMSLY — SUPABASE CLIENT
   Shared Supabase client used for two things:
     1. Real authentication (js/auth.js) — signup/login/session/profile.
     2. Web Push delivery (js/push.js) — push subscriptions + server-synced
        reminders, scoped to the same authenticated user's auth.uid().
   Both now share the same real logged-in session — there is no separate
   anonymous identity anymore now that the whole app requires real login.
   ========================================================================== */

// ==================================================
// MOMSLY SUPABASE CONFIG
// ==================================================
// Your project values from Supabase Dashboard → Project Settings → API.
const SUPABASE_URL = 'https://lsbhqapudspqrnhjyujk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WyR6QJbd9HLwVzte867Zpw_BaGt5MQc';
// The anon/publishable key is safe to expose in frontend code by design
// (it only works within your RLS policies). Never put a service_role
// key or any secret key here.

const SupabaseClient = (() => {
  let client = null;

  function isConfigured() {
    return !!SUPABASE_URL && !!SUPABASE_ANON_KEY &&
      !SUPABASE_URL.includes('YOUR_SUPABASE_URL_HERE') &&
      !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY_HERE');
  }

  function get() {
    if (!isConfigured()) return null;
    if (!client) {
      if (!window.supabase || !window.supabase.createClient) {
        console.warn('Supabase JS library not loaded.');
        return null;
      }
      // persistSession (default true) keeps the session in localStorage
      // under Supabase's own key so it survives reloads; autoRefreshToken
      // (default true) keeps it valid across long sessions.
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  // Returns the current real user if logged in via Momsly's own auth
  // (js/auth.js) — used by push.js so subscriptions/reminders are scoped
  // to the real account's auth.uid(), not a throwaway anonymous one.
  // Never throws; a null return just means push sync isn't available
  // right now (e.g. not logged in yet), which every caller already
  // treats as a graceful no-op.
  async function ensureAnonymousSession() {
    const sb = get();
    if (!sb) return null;
    try {
      const { data: { session } } = await sb.auth.getSession();
      return session?.user || null;
    } catch (e) {
      console.warn('Supabase session lookup failed', e);
      return null;
    }
  }

  return { get, isConfigured, ensureAnonymousSession };
})();
