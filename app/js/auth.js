/* ==========================================================================
   MOMSLY — AUTH
   Real cross-device authentication via Supabase Auth (email/password).
   Replaces the old local/device-only fake account system entirely.

   IMPORTANT — why the public functions below still look synchronous:
   Every other file in the app (pages.js, tracker.js, tools.js, app.js,
   and every page's inline script) calls Auth.currentUser(), isLoggedIn(),
   trialInfo(), and isPremiumActive() SYNCHRONOUSLY, in dozens of places.
   Rewriting all of those to be async would touch nearly every file and
   risk breaking things. Instead, this module keeps an in-memory cache of
   the current user + profile, populated by Auth.init() — which every
   page now awaits ONCE at the very top of its bootstrap script, before
   anything else runs. By the time any other code executes, the cache is
   already warm, so those functions can stay synchronous reads of it.
   ========================================================================== */

const Auth = (() => {
  const TRIAL_DAYS = 7;
  const PUBLIC_PAGES = ['login.html', 'signup.html', 'forgot-password.html', 'privacy.html', 'terms.html', 'offline.html'];

  // In-memory cache of the logged-in user, kept in sync by init() and
  // onAuthStateChange. Shape: { id, email, name, trialStartedAt, isPremium }
  let cachedUser = null;
  let initPromise = null;

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function sb() {
    return (typeof SupabaseClient !== 'undefined') ? SupabaseClient.get() : null;
  }

  function friendlyError(error) {
    const msg = error?.message || '';
    if (/already registered/i.test(msg)) return 'An account with this email already exists. Try logging in.';
    if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password.';
    if (/email not confirmed/i.test(msg)) return 'Please confirm your email before logging in — check your inbox.';
    if (/password.*at least/i.test(msg)) return 'Password must be at least 6 characters.';
    if (/rate limit/i.test(msg)) return 'Too many attempts — please wait a moment and try again.';
    return msg || 'Something went wrong. Please try again.';
  }

  // Fetches this user's profiles row, creating it if it doesn't exist yet
  // (first login after email confirmation, or a signup that got a session
  // immediately). Safe to call repeatedly — it's an upsert-style read.
  async function loadOrCreateProfile(supaUser) {
    const client = sb();
    if (!client || !supaUser) return null;

    const { data: existing, error: selectError } = await client
      .from('profiles')
      .select('*')
      .eq('id', supaUser.id)
      .maybeSingle();

    if (selectError) console.warn('Loading profile failed', selectError);

    if (existing) return existing;

    const newProfile = {
      id: supaUser.id,
      name: supaUser.user_metadata?.name || '',
      email: supaUser.email,
      trial_started_at: new Date().toISOString(),
      is_premium: false,
    };
    const { data: inserted, error: insertError } = await client
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (insertError) {
      console.warn('Creating profile failed', insertError);
      // Fall back to the shape we tried to insert so the app still has
      // something reasonable to show (e.g. trial countdown starts now)
      // even if the row write failed for some transient reason.
      return newProfile;
    }
    return inserted;
  }

  function setCacheFromProfile(supaUser, profile) {
    cachedUser = {
      id: supaUser.id,
      email: supaUser.email,
      name: profile?.name || supaUser.user_metadata?.name || '',
      trialStartedAt: profile?.trial_started_at || null,
      isPremium: !!profile?.is_premium,
    };
  }

  async function signup({ name, email, password }) {
    const client = sb();
    if (!client) return { ok: false, error: 'Unable to connect right now. Check your connection and try again.' };

    const { data, error } = await client.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: { data: { name: name.trim() } },
    });

    if (error) return { ok: false, error: friendlyError(error) };

    if (!data.session) {
      // Email confirmation is required by this project's Supabase auth
      // settings — the account exists but isn't logged in yet.
      return { ok: true, needsConfirmation: true };
    }

    const profile = await loadOrCreateProfile(data.user);
    setCacheFromProfile(data.user, profile);
    if (typeof Scheduler !== 'undefined') Scheduler.start();
    return { ok: true, user: cachedUser };
  }

  async function login({ email, password }) {
    const client = sb();
    if (!client) return { ok: false, error: 'Unable to connect right now. Check your connection and try again.' };

    const { data, error } = await client.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) return { ok: false, error: friendlyError(error) };

    const profile = await loadOrCreateProfile(data.user);
    setCacheFromProfile(data.user, profile);
    if (typeof Scheduler !== 'undefined') Scheduler.start();
    return { ok: true, user: cachedUser };
  }

  // Sends a password-reset email via Supabase — real auth can't do the
  // old "type email + new password in one form" flow (that only worked
  // because the old system was local and insecure by design). The link
  // in the email brings the user back to forgot-password.html, which
  // detects the recovery session and shows a set-new-password form.
  async function requestPasswordReset(email) {
    const client = sb();
    if (!client) return { ok: false, error: 'Unable to connect right now. Check your connection and try again.' };
    const { error } = await client.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: window.location.origin + window.location.pathname.replace(/[^/]+$/, 'forgot-password.html'),
    });
    if (error) return { ok: false, error: friendlyError(error) };
    return { ok: true };
  }

  // Sets a new password — only works when the user arrived via a valid
  // recovery link (Supabase gives them a temporary recovery session).
  async function updatePassword(newPassword) {
    const client = sb();
    if (!client) return { ok: false, error: 'Unable to connect right now. Check your connection and try again.' };
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: friendlyError(error) };
    return { ok: true };
  }

  async function logout() {
    const client = sb();
    if (client) await client.auth.signOut();
    cachedUser = null;
    window.location.href = 'login.html';
  }

  function currentUser() {
    return cachedUser;
  }

  function isLoggedIn() {
    return !!cachedUser;
  }

  function trialInfo() {
    if (!cachedUser) return { isPremium: false, daysLeft: TRIAL_DAYS, expired: false };
    if (cachedUser.isPremium) return { isPremium: true, daysLeft: 0, expired: false };
    if (!cachedUser.trialStartedAt) return { isPremium: false, daysLeft: TRIAL_DAYS, expired: false };
    const elapsedDays = (Date.now() - new Date(cachedUser.trialStartedAt).getTime()) / 86400000;
    const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays));
    return { isPremium: false, daysLeft, expired: elapsedDays >= TRIAL_DAYS };
  }

  function isPremiumActive() {
    const info = trialInfo();
    return info.isPremium || !info.expired;
  }

  async function activatePremium() {
    if (!cachedUser) return { ok: false, error: 'Not logged in.' };
    const client = sb();
    if (!client) return { ok: false, error: 'Unable to connect right now.' };
    const { error } = await client.from('profiles').update({ is_premium: true }).eq('id', cachedUser.id);
    if (error) { console.warn('activatePremium failed', error); return { ok: false, error: friendlyError(error) }; }
    cachedUser.isPremium = true;
    return { ok: true };
  }

  // Called once by every page, before any other page logic runs. Checks
  // for an existing Supabase session, warms the in-memory cache, redirects
  // unauthenticated visitors away from protected pages, and starts the
  // reminder scheduler if logged in.
  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const client = sb();
      const current = (window.location.pathname.split('/').pop() || 'index.html');

      if (!client) {
        // Supabase unreachable/misconfigured — fail safe by treating the
        // visitor as logged out rather than crashing the page.
        cachedUser = null;
      } else {
        try {
          const { data: { session } } = await client.auth.getSession();
          if (session?.user) {
            const profile = await loadOrCreateProfile(session.user);
            setCacheFromProfile(session.user, profile);
          } else {
            cachedUser = null;
          }
        } catch (e) {
          console.warn('Auth session check failed', e);
          cachedUser = null;
        }

        // Keep the cache in sync if the session changes in another tab,
        // or expires/refreshes — without forcing a redirect loop here.
        client.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') { cachedUser = null; }
          else if (session?.user && cachedUser && session.user.id === cachedUser.id) {
            // token refresh etc. — cached profile fields still valid.
          }
        });
      }

      if (!cachedUser && !PUBLIC_PAGES.includes(current)) {
        window.location.href = 'login.html';
        return; // don't bother starting the scheduler etc. — we're navigating away
      }

      if (cachedUser && typeof Scheduler !== 'undefined') Scheduler.start();
    })();
    return initPromise;
  }

  return {
    signup, login, logout, requestPasswordReset, updatePassword,
    currentUser, isLoggedIn, trialInfo, isPremiumActive, activatePremium,
    isValidEmail, init,
  };
})();
