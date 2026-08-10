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

  function attachRipple(root = document) {
    root.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.btn, .fab, .icon-btn, .tool-card, .quick-action, .chip, .nav-item');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple-el';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      const computed = getComputedStyle(btn);
      if (computed.position === 'static') btn.style.position = 'relative';
      btn.style.overflow = btn.classList.contains('fab') || btn.classList.contains('icon-btn') ? 'hidden' : btn.style.overflow;
      if (btn.classList.contains('btn') || btn.classList.contains('fab') || btn.classList.contains('icon-btn')) {
        btn.style.overflow = 'hidden';
      }
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  function skeletonCard() {
    return `<div class="card"><div class="skeleton" style="height:16px;width:60%;margin-bottom:10px;"></div><div class="skeleton" style="height:12px;width:90%;"></div></div>`;
  }

  function confetti() {
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);

    const colors = ['#F472B6', '#A78BFA', '#FDE68A', '#22C55E', '#60A5FA'];
    const pieces = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 200,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 3,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * 360,
      vr: -8 + Math.random() * 16,
    }));

    let frame = 0;
    function tick() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = false;
      for (const p of pieces) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y < window.innerHeight + 20) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      frame++;
      if (alive && frame < 220) requestAnimationFrame(tick);
      else canvas.remove();
    }
    requestAnimationFrame(tick);
  }

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

  document.addEventListener('DOMContentLoaded', () => attachRipple());

  return { toast, openSheet, closeSheet, closeAllSheets, confirmDialog, skeletonCard, confetti };
})();
