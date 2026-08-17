/* ==========================================================================
   MOMSLY — SUPABASE CLIENT
   Shared Supabase client used for:
     1. Real authentication (js/auth.js)
     2. Web Push delivery (js/push.js)

   Both use the same real logged-in Supabase session.
   There is no anonymous identity.
   ========================================================================== */

// ==================================================
// MOMSLY SUPABASE CONFIG
// ==================================================

const SUPABASE_URL = 'https://lsbhqapudspqrnhjyujk.supabase.co';

const SUPABASE_ANON_KEY =
  'sb_publishable_WyR6QJbd9HLwVzte867Zpw_BaGt5MQc';


// ==================================================
// SUPABASE CLIENT
// ==================================================

const SupabaseClient = (() => {
  let client = null;

  function isConfigured() {
    return !!SUPABASE_URL &&
      !!SUPABASE_ANON_KEY &&
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

      client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );
    }

    return client;
  }

  // Returns the currently authenticated real Supabase user.
  // Does NOT create an anonymous session.
  async function getCurrentUser() {
    const sb = get();

    if (!sb) return null;

    try {
      const {
        data: { session }
      } = await sb.auth.getSession();

      return session?.user || null;
    } catch (e) {
      console.warn('Supabase session lookup failed', e);
      return null;
    }
  }

  // Kept for compatibility with existing Momsly code.
  // Despite the old function name, this now returns the
  // real authenticated user and NEVER creates an anonymous user.
  async function ensureAnonymousSession() {
    return await getCurrentUser();
  }

  return {
    get,
    isConfigured,
    getCurrentUser,
    ensureAnonymousSession
  };
})();
