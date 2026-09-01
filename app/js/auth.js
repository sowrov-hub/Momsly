/* ==========================================================================
   MOMSLY — AUTH
   Real cross-device authentication via Supabase Auth (email/password).

   Trial system:
     - Uses profiles.trial_end as the single source of truth.
     - Uses profiles.is_premium for premium status.
     - Does NOT use the old trial_started_at field.

   IMPORTANT — why the public functions below still look synchronous:
   Every other file in the app (pages.js, tracker.js, tools.js, app.js,
   and every page's inline script) calls Auth.currentUser(), isLoggedIn(),
   trialInfo(), and isPremiumActive() SYNCHRONOUSLY, in dozens of places.
   Rewriting all of those to be async would touch nearly every file and
   risk breaking things.

   Instead, this module keeps an in-memory cache of the current user +
   profile, populated by Auth.init() — which every page awaits ONCE at the
   very top of its bootstrap script, before anything else runs.

   By the time any other code executes, the cache is already warm, so those
   functions can stay synchronous reads of it.
   ========================================================================== */

const Auth = (() => {
  const TRIAL_DAYS = 3;

  const PUBLIC_PAGES = [
    'welcome.html',
    'login.html',
    'signup.html',
    'forgot-password.html',
    'privacy.html',
    'terms.html',
    'offline.html'
  ];

  // Where a signed-out visitor is sent: the welcome screen, which then
  // offers Get Started / Log In. Logging out returns here too, so the
  // app always opens on the same front door.
  const ENTRY_PAGE = 'welcome.html';

  // In-memory cache of the logged-in user.
  //
  // Shape:
  // {
  //   id,
  //   email,
  //   name,
  //   trialEnd,
  //   isPremium
  // }
  let cachedUser = null;
  let initPromise = null;


  // ==================================================
  // HELPERS
  // ==================================================

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }


  function sb() {
    return (typeof SupabaseClient !== 'undefined')
      ? SupabaseClient.get()
      : null;
  }


  function friendlyError(error) {
    const msg = error?.message || '';

    if (/already registered/i.test(msg)) {
      return 'An account with this email already exists. Try logging in.';
    }

    if (/invalid login credentials/i.test(msg)) {
      return 'Incorrect email or password.';
    }

    if (/email not confirmed/i.test(msg)) {
      return 'Please confirm your email before logging in — check your inbox.';
    }

    if (/password.*at least/i.test(msg)) {
      return 'Password must be at least 6 characters.';
    }

    if (/rate limit/i.test(msg)) {
      return 'Too many attempts — please wait a moment and try again.';
    }

    return msg || 'Something went wrong. Please try again.';
  }


  // ==================================================
  // PROFILE LOADING
  // ==================================================

  // Fetches this user's profiles row.
  //
  // If the profile doesn't exist, creates one with a 3-day trial.
  //
  // IMPORTANT:
  // The database's trial_end column is the source of truth.
  async function loadOrCreateProfile(supaUser) {
    const client = sb();

    if (!client || !supaUser) return null;


    // ------------------------------------------
    // Try to load existing profile
    // ------------------------------------------

    const {
      data: existing,
      error: selectError
    } = await client
      .from('profiles')
      .select('*')
      .eq('id', supaUser.id)
      .maybeSingle();

    if (selectError) {
      console.warn('Loading profile failed', selectError);
    }


    // Existing profile
    if (existing) {
      return await reconcilePremiumDrift(client, existing);
    }


    // ------------------------------------------
    // Create new profile
    // ------------------------------------------

    const newProfile = {
      id: supaUser.id,

      full_name:
        supaUser.user_metadata?.name || '',

      trial_end:
        new Date(
          Date.now() + TRIAL_DAYS * 86400000
        ).toISOString(),

      is_premium: false
    };


    const {
      data: inserted,
      error: insertError
    } = await client
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();


    if (insertError) {

      // Most likely the row already exists but the first SELECT
      // temporarily missed it.
      console.warn(
        'Creating profile failed, re-fetching existing row',
        insertError
      );


      const {
        data: refetched,
        error: refetchError
      } = await client
        .from('profiles')
        .select('*')
        .eq('id', supaUser.id)
        .maybeSingle();


      if (refetchError) {
        console.warn(
          'Re-fetch after insert conflict also failed',
          refetchError
        );
      }


      if (refetched) {
        return await reconcilePremiumDrift(
          client,
          refetched
        );
      }


      // Genuinely couldn't create/read the profile.
      // Return the local shape so the app can still render.
      return newProfile;
    }


    return inserted;
  }


  // ==================================================
  // PREMIUM DATA RECONCILIATION
  // ==================================================

  // Some older profiles may contain a legacy `premium` column.
  //
  // `is_premium` is the current column used by Momsly.
  // If the legacy column exists and either value is true,
  // keep the user premium rather than accidentally downgrading them.
  async function reconcilePremiumDrift(client, profile) {
    if (!profile || typeof profile.premium === 'undefined') {
      return profile;
    }


    const shouldBePremium =
      !!profile.is_premium ||
      !!profile.premium;


    if (shouldBePremium !== !!profile.is_premium) {

      const {
        error
      } = await client
        .from('profiles')
        .update({
          is_premium: shouldBePremium
        })
        .eq('id', profile.id);


      if (error) {
        console.warn(
          'Premium drift reconciliation failed',
          error
        );
      } else {
        profile.is_premium = shouldBePremium;
      }
    }


    return profile;
  }


  // ==================================================
  // CACHE PROFILE
  // ==================================================

  function setCacheFromProfile(supaUser, profile) {

    cachedUser = {
      id: supaUser.id,

      email: supaUser.email,

      name:
        profile?.full_name ||
        profile?.name ||
        supaUser.user_metadata?.name ||
        '',

      // IMPORTANT:
      // This comes directly from profiles.trial_end.
      trialEnd:
        profile?.trial_end || null,

      isPremium:
        !!profile?.is_premium
    };
  }


  // ==================================================
  // SIGNUP
  // ==================================================

  async function signup({ name, email, password }) {

    const client = sb();

    if (!client) {
      return {
        ok: false,
        error:
          'Unable to connect right now. Check your connection and try again.'
      };
    }


    const {
      data,
      error
    } = await client.auth.signUp({
      email: email.toLowerCase().trim(),
      password,

      options: {
        data: {
          name: name.trim()
        }
      }
    });


    if (error) {
      return {
        ok: false,
        error: friendlyError(error)
      };
    }


    if (!data.session) {

      // Email confirmation is required.
      return {
        ok: true,
        needsConfirmation: true
      };
    }


    const profile =
      await loadOrCreateProfile(data.user);


    setCacheFromProfile(
      data.user,
      profile
    );


    if (
      typeof Scheduler !== 'undefined' &&
      typeof Scheduler.start === 'function'
    ) {
      Scheduler.start();
    }


    return {
      ok: true,
      user: cachedUser
    };
  }


  // ==================================================
  // LOGIN
  // ==================================================

  async function login({ email, password }) {

    const client = sb();

    if (!client) {
      return {
        ok: false,
        error:
          'Unable to connect right now. Check your connection and try again.'
      };
    }


    const {
      data,
      error
    } = await client.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password
    });


    if (error) {
      return {
        ok: false,
        error: friendlyError(error)
      };
    }


    const profile =
      await loadOrCreateProfile(data.user);


    setCacheFromProfile(
      data.user,
      profile
    );


    if (
      typeof Scheduler !== 'undefined' &&
      typeof Scheduler.start === 'function'
    ) {
      Scheduler.start();
    }


    return {
      ok: true,
      user: cachedUser
    };
  }


  // ==================================================
  // PASSWORD RESET
  // ==================================================

  async function requestPasswordReset(email) {

    const client = sb();

    if (!client) {
      return {
        ok: false,
        error:
          'Unable to connect right now. Check your connection and try again.'
      };
    }


    const {
      error
    } = await client.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      {
        redirectTo:
          window.location.origin +
          window.location.pathname.replace(
            /[^/]+$/,
            'forgot-password.html'
          )
      }
    );


    if (error) {
      return {
        ok: false,
        error: friendlyError(error)
      };
    }


    return {
      ok: true
    };
  }


  // ==================================================
  // UPDATE PASSWORD
  // ==================================================

  async function updatePassword(newPassword) {

    const client = sb();

    if (!client) {
      return {
        ok: false,
        error:
          'Unable to connect right now. Check your connection and try again.'
      };
    }


    const {
      error
    } = await client.auth.updateUser({
      password: newPassword
    });


    if (error) {
      return {
        ok: false,
        error: friendlyError(error)
      };
    }


    return {
      ok: true
    };
  }


  // ==================================================
  // LOGOUT
  // ==================================================

  async function logout() {

    const client = sb();

    if (client) {
      await client.auth.signOut();
    }


    cachedUser = null;

    window.location.href = ENTRY_PAGE;
  }


  // ==================================================
  // CURRENT USER
  // ==================================================

  function currentUser() {
    return cachedUser;
  }


  function isLoggedIn() {
    return !!cachedUser;
  }


  // ==================================================
  // TRIAL INFORMATION
  // ==================================================
  //
  // IMPORTANT:
  // This uses profiles.trial_end directly.
  //
  // It does NOT calculate the trial from signup time.
  // This prevents the UI from getting stuck at 3 days.
  // ==================================================

  function trialInfo() {

    if (!cachedUser) {
      return {
        isPremium: false,
        daysLeft: TRIAL_DAYS,
        expired: false
      };
    }


    // Premium users don't have trial countdown.
    if (cachedUser.isPremium) {
      return {
        isPremium: true,
        daysLeft: 0,
        expired: false
      };
    }


    // Existing profile should normally always have trialEnd.
    // Keep the fallback for safety.
    if (!cachedUser.trialEnd) {
      return {
        isPremium: false,
        daysLeft: TRIAL_DAYS,
        expired: false
      };
    }


    const trialEnd =
      new Date(cachedUser.trialEnd).getTime();


    const remainingMs =
      trialEnd - Date.now();


    const daysLeft =
      Math.max(
        0,
        Math.ceil(
          remainingMs / 86400000
        )
      );


    return {
      isPremium: false,
      daysLeft,
      expired: remainingMs <= 0
    };
  }


  // ==================================================
  // PREMIUM STATUS
  // ==================================================

  function isPremiumActive() {

    const info = trialInfo();

    return (
      info.isPremium ||
      !info.expired
    );
  }


  // ==================================================
  // ACTIVATE PREMIUM
  // ==================================================

  async function activatePremium() {

    if (!cachedUser) {
      return {
        ok: false,
        error: 'Not logged in.'
      };
    }


    const client = sb();

    if (!client) {
      return {
        ok: false,
        error:
          'Unable to connect right now.'
      };
    }


    const {
      error
    } = await client
      .from('profiles')
      .update({
        is_premium: true
      })
      .eq('id', cachedUser.id);


    if (error) {

      console.warn(
        'activatePremium failed',
        error
      );

      return {
        ok: false,
        error: friendlyError(error)
      };
    }


    cachedUser.isPremium = true;


    return {
      ok: true
    };
  }


  // ==================================================
  // INITIALIZE AUTH
  // ==================================================

  // Called once by every page before page logic runs.
  //
  // Checks the existing Supabase session,
  // loads the profile,
  // warms the cache,
  // redirects unauthenticated visitors,
  // and starts the reminder scheduler.
  async function init() {

    if (initPromise) {
      return initPromise;
    }


    initPromise = (async () => {

      const client = sb();

      const current =
        window.location.pathname
          .split('/')
          .pop() ||
        'index.html';


      if (!client) {

        cachedUser = null;

      } else {

        try {

          const {
            data: {
              session
            }
          } = await client.auth.getSession();


          if (session?.user) {

            const profile =
              await loadOrCreateProfile(
                session.user
              );


            setCacheFromProfile(
              session.user,
              profile
            );

          } else {

            cachedUser = null;
          }

        } catch (e) {

          console.warn(
            'Auth session check failed',
            e
          );

          cachedUser = null;
        }


        // Keep cache in sync with Supabase auth.
        client.auth.onAuthStateChange(
          (event, session) => {

            if (event === 'SIGNED_OUT') {

              cachedUser = null;

            } else if (
              session?.user &&
              cachedUser &&
              session.user.id === cachedUser.id
            ) {

              // Token refresh etc.
              // Profile cache remains valid.
            }
          }
        );
      }


      // Redirect unauthenticated visitors away
      // from protected pages.

      if (
        !cachedUser &&
        !PUBLIC_PAGES.includes(current)
      ) {

        window.location.href = ENTRY_PAGE;

        return;
      }


      // Start reminder scheduler after auth is ready.

      if (
        cachedUser &&
        typeof Scheduler !== 'undefined' &&
        typeof Scheduler.start === 'function'
      ) {
        Scheduler.start();
      }

    })();


    return initPromise;
  }


  // ==================================================
  // PUBLIC API
  // ==================================================

  return {
    signup,
    login,
    logout,

    requestPasswordReset,
    updatePassword,

    currentUser,
    isLoggedIn,

    trialInfo,
    isPremiumActive,

    activatePremium,

    isValidEmail,

    init
  };

})();
