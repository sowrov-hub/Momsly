/* ==========================================================================
   MOMSLY — SHARE
   Thin wrapper around the Web Share API with a clipboard fallback for
   browsers/desktops that don't support navigator.share.
   ========================================================================== */

const Share = (() => {

  async function shareText({ title = 'Momsly', text, url = window.location.href }) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch (e) {
        if (e.name !== 'AbortError') UI.toast("Couldn't share — copied instead.", '');
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      UI.toast('Copied to clipboard.', 'success');
      return true;
    } catch (e) {
      UI.toast('Sharing is not available on this device.', 'error');
      return false;
    }
  }

  function shareMilestone(m) {
    return shareText({
      title: 'A Momsly milestone',
      text: `🎉 ${m.title} — ${Utils.formatDate(m.date)}${m.note ? '\n' + m.note : ''}`,
    });
  }

  function shareSummary(childName, summary) {
    return shareText({
      title: 'Momsly daily summary',
      text: `${childName}'s day on Momsly: ${summary}`,
    });
  }

  return { shareText, shareMilestone, shareSummary };
})();
