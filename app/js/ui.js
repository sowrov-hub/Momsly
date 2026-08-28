/* ==========================================================================
   MOMSLY — UI
   Toasts, sheets, modals, ripple micro-interaction. Presentation-only;
   never touches Storage directly.
   ========================================================================== */

const UI = (() => {

  function ensureToastStack() {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(message, type = '') {
    const stack = ensureToastStack();
    const el = document.createElement('div');
    el.className = `toast ${type ? 'toast--' + type : ''}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 200ms ease, transform 200ms ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => el.remove(), 220);
    }, 2600);
  }

  function openSheet(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function closeAllSheets() {
    document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
    document.body.style.overflow = '';
  }

  function confirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
    return new Promise((resolve) => {
      const existing = document.getElementById('ui-confirm-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'ui-confirm-overlay';
      overlay.className = 'overlay overlay--center open';
      overlay.innerHTML = `
        <div class="modal-card">
          <h3>${Utils.escapeHtml(title)}</h3>
          <p class="subtext">${Utils.escapeHtml(message)}</p>
          <div class="modal-actions">
            <button class="btn btn--secondary" data-action="cancel">${Utils.escapeHtml(cancelLabel)}</button>
            <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-action="confirm">${Utils.escapeHtml(confirmLabel)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { cleanup(false); }
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (action === 'cancel') cleanup(false);
        if (action === 'confirm') cleanup(true);
      });

      function cleanup(result) {
        overlay.remove();
        document.body.style.overflow = '';
        resolve(result);
      }
    });
  }

  // One-off placeholder card. Page-level loading states come from
  // Skeleton.show() instead; this is here for ad-hoc use.
  function skeletonCard() {
    return `<div class="sk-card"><div class="sk sk--line" style="height:16px;width:60%;margin-bottom:10px;"></div><div class="sk sk--line" style="height:12px;width:90%;"></div></div>`;
  }

  // Animations are disabled app-wide — kept as a no-op so existing call
  // sites (milestone completion, premium unlock) don't need to change.
  function confetti() {}

  // Wire up any element with data-close-sheet inside an overlay
  document.addEventListener('click', (e) => {
    const closeTrigger = e.target.closest('[data-close-sheet]');
    if (closeTrigger) {
      const overlay = closeTrigger.closest('.overlay');
      if (overlay) closeSheet(overlay.id);
    }
    const overlayBg = e.target.classList?.contains('overlay') ? e.target : null;
    if (overlayBg) closeSheet(overlayBg.id);
  });

  return { toast, openSheet, closeSheet, closeAllSheets, confirmDialog, skeletonCard, confetti };
})();
