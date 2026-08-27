/* ==========================================================================
   MOMSLY — NOTIFICATION
   Wraps the browser Notification API. While a tab is open we can trigger
   real notifications the moment a reminder is due; when the app is
   installed as a PWA, the service worker keeps the notification tappable.
   True background delivery when the browser is fully closed needs a push
   server, which is out of scope for a backend-free, local-storage app —
   this delivers reliably whenever Momsly is open or backgrounded.
   ========================================================================== */

const NotificationService = (() => {

  function isSupported() {
    return 'Notification' in window;
  }

  function permission() {
    return isSupported() ? Notification.permission : 'unsupported';
  }

  async function requestPermission() {
    if (!isSupported()) return 'unsupported';
    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  }

  function fire({ title, body, tag, icon = 'assets/icons/icon-192.png' }) {
    Utils.playChime();
    Utils.vibrate([60, 40, 60]);

    if (isSupported() && Notification.permission === 'granted') {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, { body, tag, icon, badge: icon, vibrate: [60, 40, 60] });
          });
        } else {
          new Notification(title, { body, tag, icon });
        }
        return;
      } catch (e) { /* fall through to in-app toast */ }
    }
    UI.toast(`${title} — ${body}`, '');
  }

  return { isSupported, permission, requestPermission, fire };
})();
