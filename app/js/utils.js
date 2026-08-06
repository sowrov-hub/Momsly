/* ==========================================================================
   MOMSLY — UTILS
   Small pure helpers shared across every module.
   ========================================================================== */

const Utils = (() => {

  function uid() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function formatTime(dateOrISO) {
    const d = dateOrISO instanceof Date ? dateOrISO : new Date(dateOrISO);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function formatDate(dateOrISO) {
    const d = dateOrISO instanceof Date ? dateOrISO : new Date(dateOrISO);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatDateTime(dateOrISO) {
    return `${formatDate(dateOrISO)}, ${formatTime(dateOrISO)}`;
  }

  function relativeTime(dateOrISO) {
    const d = dateOrISO instanceof Date ? dateOrISO : new Date(dateOrISO);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  }

  function durationLabel(ms) {
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function formatTimer(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function ageLabel(birthDateISO) {
    if (!birthDateISO) return '';
    const birth = new Date(birthDateISO);
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) months -= 1;
    if (months < 1) {
      const days = Math.max(0, Math.round((now - birth) / 86400000));
      return `${days}d old`;
    }
    if (months < 24) return `${months}mo old`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}mo old` : `${years}y old`;
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function debounce(fn, wait = 250) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
  }

  function todayKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
  }

  function isToday(iso) {
    return todayKey(new Date(iso)) === todayKey();
  }

  function daysAgo(iso) {
    const d = new Date(iso);
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  function vibrate(pattern = [40]) {
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
  }

  function playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const notes = [880, 1108, 1318];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.55);
      });
    } catch (e) { /* audio unavailable */ }
  }

  return {
    uid, nowISO, formatTime, formatDate, formatDateTime, relativeTime,
    durationLabel, formatTimer, ageLabel, clamp, debounce, escapeHtml,
    initials, todayKey, isToday, daysAgo, vibrate, playChime
  };
})();
