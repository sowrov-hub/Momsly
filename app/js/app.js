/* ==========================================================================
   MOMSLY — APP
   Boots on every page: mounts header + bottom nav, applies dark mode,
   registers the service worker, and manages the install prompt.
   ========================================================================== */

const App = (() => {
  let deferredInstallPrompt = null;

  function applyTheme() {
    const settings = Storage.get('settings') || {};
    const theme = settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggleIcon(theme);
  }

  function toggleTheme() {
    const settings = Storage.get('settings') || {};
    const next = (settings.theme || 'light') === 'light' ? 'dark' : 'light';
    settings.theme = next;
    Storage.set('settings', settings);
    document.documentElement.setAttribute('data-theme', next);
    updateThemeToggleIcon(next);
  }

  function updateThemeToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.innerHTML = theme === 'dark' ? Icons.sun : Icons.moon;
  }

  function mountShell({ title, activeHref, showBack = false, backHref = 'index.html' }) {
    const headerMount = document.getElementById('app-header-mount');
    const navMount = document.getElementById('bottom-nav-mount');
    if (headerMount) headerMount.outerHTML = Components.header({ title, showBack, backHref });
    if (navMount) navMount.outerHTML = Components.bottomNav(activeHref);
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    applyTheme();
  }

  function trialBannerHTML() {
    const info = Auth.trialInfo();
    if (info.isPremium) return '';
    if (info.expired) {
      return `<div class="trial-banner">${Icons.crown}<span>Your free trial has ended.</span><a class="link-cta" href="upgrade.html">Upgrade</a></div>`;
    }
    return `<div class="trial-banner">${Icons.sparkles}<span>${info.daysLeft} day${info.daysLeft === 1 ? '' : 's'} left in your free trial.</span><a class="link-cta" href="upgrade.html">Upgrade</a></div>`;
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration failed', err));
      });
    }
  }

  function initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const dismissed = sessionStorage.getItem('momsly-install-dismissed');
      if (!dismissed) showInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
      hideInstallBanner();
      UI.toast('Momsly installed! 💗', 'success');
    });
  }

  function showInstallBanner() {
    let banner = document.getElementById('install-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'install-banner';
      banner.className = 'install-banner';
      banner.innerHTML = `
        <img class="brand-mark" style="width:36px;height:36px;" src="assets/icons/icon-192.png" alt="Momsly">
        <p><strong>Install Momsly</strong>Add to your home screen for quick, offline access.</p>
        <button class="btn btn--sm btn--primary" id="install-accept" style="width:auto;">Install</button>
        <button class="icon-btn" id="install-dismiss" aria-label="Dismiss" style="width:32px;height:32px;">${Icons.close}</button>`;
      document.body.appendChild(banner);
      document.getElementById('install-accept').addEventListener('click', async () => {
        hideInstallBanner();
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          await deferredInstallPrompt.userChoice;
          deferredInstallPrompt = null;
        }
      });
      document.getElementById('install-dismiss').addEventListener('click', () => {
        sessionStorage.setItem('momsly-install-dismissed', '1');
        hideInstallBanner();
      });
    }
    requestAnimationFrame(() => banner.classList.add('show'));
  }

  function hideInstallBanner() {
    document.getElementById('install-banner')?.classList.remove('show');
  }

  function greeting() {
    const hour = new Date().getHours();
    const user = Auth.currentUser();
    const firstName = user?.name?.split(' ')[0] || 'there';
    if (hour < 12) return `Good morning, ${firstName}`;
    if (hour < 18) return `Good afternoon, ${firstName}`;
    return `Good evening, ${firstName}`;
  }

  function init() {
    applyTheme();
    registerServiceWorker();
    initInstallPrompt();
  }

  return { mountShell, toggleTheme, applyTheme, trialBannerHTML, greeting, init };
})();

// Deferred scripts already run after the DOM is fully parsed, so this
// can call straight through — no need to wait for DOMContentLoaded.
// (Doing so via that event would instead register this *after* any
// page's own trailing bootstrap script, which itself must wait for
// DOMContentLoaded to guarantee every deferred script above it has
// run — inverting the intended init order.)
App.init();
