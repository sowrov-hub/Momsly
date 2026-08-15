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

  // Clicking a tool card opens its sheet via an in-page #hash link. That
  // works the FIRST time, but browsers don't fire 'hashchange' when the
  // URL hash is set to the value it's already at — so closing a sheet
  // and tapping the same tool card again did nothing, because the hash
  // never "changed". This opens the sheet directly on click instead of
  // relying purely on hashchange, so re-opening the same tool always works.
  function handleInPageHashClick(e) {
    const link = e.target.closest('a[href*="#"]');
    if (!link) return;
    let url;
    try { url = new URL(link.getAttribute('href'), window.location.href); } catch (err) { return; }
    if (url.pathname !== window.location.pathname) return; // different page — let it navigate normally
    const hash = url.hash.replace('#', '');
    if (!hash) return;
    const sheetId = `sheet-${hash}`;
    if (!document.getElementById(sheetId)) return; // not a sheet target — normal anchor/scroll behavior

    e.preventDefault();
    if (window.location.hash !== `#${hash}`) {
      window.location.hash = hash;
    }
    UI.openSheet(sheetId);
  }

  function goTo(url) {
    window.location.href = url;
  }

  function init() {
    handleHash();
    window.addEventListener('hashchange', handleHash);
    document.addEventListener('click', handleInPageHashClick);
  }

  return { init, goTo, handleHash };
})();

document.addEventListener('DOMContentLoaded', Router.init);
