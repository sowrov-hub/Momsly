/* ==========================================================================
   MOMSLY — ROUTER
   Momsly is intentionally multi-page (GitHub Pages friendly, no build
   step). This router only handles the light job left: opening the right
   bottom-sheet on tools.html / profile.html when the URL carries a
   #hash (e.g. tools.html#reminders from a tool card or a notification).
   ========================================================================== */

const Router = (() => {

  function handleHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const sheetId = `sheet-${hash}`;
    const sheet = document.getElementById(sheetId);
    if (sheet) {
      setTimeout(() => UI.openSheet(sheetId), 80);
    } else {
      const section = document.getElementById(hash);
      if (section) setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }

  function goTo(url) {
    window.location.href = url;
  }

  function init() {
    handleHash();
    window.addEventListener('hashchange', handleHash);
  }

  return { init, goTo, handleHash };
})();

document.addEventListener('DOMContentLoaded', Router.init);
