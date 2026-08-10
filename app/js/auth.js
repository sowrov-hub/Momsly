/* ==========================================================================
   MOMSLY — AUTH
   No backend by design (GitHub Pages, local-only). "Auth" here means a
   local account record + session flag, enough to gate the app and drive
   the 7-day trial → Lifetime Premium flow honestly on-device.
   ========================================================================== */

const Auth = (() => {
  const TRIAL_DAYS = 7;

  function hash(str) {
    // Not cryptographic — this is a local-only demo account store with no
    // server, so we simply avoid storing the raw password string as-is.
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return 'h' + Math.abs(h).toString(36) + str.length;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function signup({ name, email, password }) {
    const root = Storage.all();
    if (root.user && root.user.email === email.toLowerCase()) {
      return { ok: false, error: 'An account with this email already exists. Try logging in.' };
    }
    const user = {
      id: Utils.uid(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passHash: hash(password),
      createdAt: Utils.nowISO(),
    };
    Storage.set('user', user);
    Storage.set('session', { userId: user.id, loggedInAt: Utils.nowISO() });
    Storage.set('trialStartedAt', Utils.nowISO());
    Storage.set('isPremium', false);
    return { ok: true, user };
  }

  function login({ email, password }) {
    const root = Storage.all();
    if (!root.user || root.user.email !== email.toLowerCase().trim()) {
      return { ok: false, error: 'No account found with that email.' };
    }
    if (root.user.passHash !== hash(password)) {
      return { ok: false, error: 'Incorrect password. Try again.' };
    }
    Storage.set('session', { userId: root.user.id, loggedInAt: Utils.nowISO() });
    if (!root.trialStartedAt) Storage.set('trialStartedAt', Utils.nowISO());
    return { ok: true, user: root.user };
  }

  function resetPassword({ email, newPassword }) {
    const root = Storage.all();
    if (!root.user || root.user.email !== email.toLowerCase().trim()) {
      return { ok: false, error: 'No account found with that email.' };
    }
    root.user.passHash = hash(newPassword);
    Storage.set('user', root.user);
    return { ok: true };
  }

  function logout() {
    Storage.set('session', null);
    window.location.href = 'login.html';
  }

  function currentUser() {
    return Storage.get('user');
  }

  function isLoggedIn() {
    const session = Storage.get('session');
    const user = Storage.get('user');
    return !!(session && user && session.userId === user.id);
  }

  function trialInfo() {
    const startedAt = Storage.get('trialStartedAt');
    const isPremium = Storage.get('isPremium');
    if (isPremium) return { isPremium: true, daysLeft: 0, expired: false };
    if (!startedAt) return { isPremium: false, daysLeft: TRIAL_DAYS, expired: false };
    const elapsedDays = (Date.now() - new Date(startedAt).getTime()) / 86400000;
    const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - elapsedDays));
    return { isPremium: false, daysLeft, expired: elapsedDays >= TRIAL_DAYS };
  }

  function isPremiumActive() {
    const info = trialInfo();
    return info.isPremium || !info.expired;
  }

  function activatePremium() {
    Storage.set('isPremium', true);
  }

  // Redirect unauthenticated visitors away from protected pages.
  function guardPage() {
    if (!isLoggedIn()) {
      const publicPages = ['login.html', 'signup.html', 'forgot-password.html', 'privacy.html', 'terms.html', 'offline.html'];
      const current = window.location.pathname.split('/').pop() || 'index.html';
      if (!publicPages.includes(current)) {
        window.location.href = 'login.html';
      }
    }
  }

  return { signup, login, resetPassword, logout, currentUser, isLoggedIn, trialInfo, isPremiumActive, activatePremium, guardPage, isValidEmail };
})();

Auth.guardPage();
