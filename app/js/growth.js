/* ==========================================================================
   MOMSLY — GROWTH TRACKER
   Drives growth.html: weight and height in one tool. Both were separate
   tools before, which meant two trips to see one picture of how a baby
   is growing.

   These are ordinary `weight` / `height` tracker logs underneath — the
   same entries the Tracker page and the dashboard's growth cards read —
   so logging here shows up everywhere else, and vice versa.
   ========================================================================== */

const GrowthTracker = (() => {
  const METRICS = {
    weight: { label: 'Weight', unit: 'lb', icon: 'weight', step: '0.1', placeholder: '14.2' },
    height: { label: 'Height', unit: 'in', icon: 'ruler',  step: '0.1', placeholder: '24.5' },
  };

  let metric = 'weight';

  function activeChild() {
    const children = Storage.get('children') || [];
    const activeId = Storage.get('activeChildId');
    return children.find(c => c.id === activeId) || children[0] || null;
  }

  // Oldest first — charts read left to right, so this is the useful order.
  function logsOf(type) {
    const child = activeChild();
    return (Storage.get('logs') || [])
      .filter(l => l.type === type && (!child || l.childId === child.id))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /* ---------------- summary cards (both metrics at once) ---------------- */

  function renderSummary() {
    const el = document.getElementById('growth-summary');
    if (!el) return;

    el.innerHTML = Object.entries(METRICS).map(([key, m]) => {
      const logs = logsOf(key);
      const latest = logs[logs.length - 1] || null;
      const prev = logs[logs.length - 2] || null;
      const delta = latest && prev ? latest.value - prev.value : null;

      return `
        <div class="mh-card mh-metric">
          <span class="mh-metric__icon">${Icons[m.icon]}</span>
          <div>
            <h4>${m.label}</h4>
            <p class="mh-metric__value">${latest ? Utils.escapeHtml(String(latest.value)) + ' ' + m.unit : '—'}</p>
            <p class="mh-metric__meta">${
              latest
                ? (delta !== null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${m.unit} since last · ` : '') + Utils.relativeTime(latest.timestamp)
                : 'Not logged yet'
            }</p>
          </div>
        </div>`;
    }).join('');
  }

  /* ---------------- metric switcher ---------------- */

  function renderTabs() {
    const el = document.getElementById('growth-tabs');
    if (!el) return;
    el.innerHTML = Object.entries(METRICS).map(([key, m]) =>
      `<button data-metric="${key}" class="${key === metric ? 'active' : ''}">${m.label}</button>`).join('');

    el.querySelectorAll('[data-metric]').forEach(btn =>
      btn.addEventListener('click', () => {
        metric = btn.dataset.metric;
        renderTabs();
        renderForm();
        renderChart();
        renderHistory();
      }));
  }

  /* ---------------- quick log form ---------------- */

  function renderForm() {
    const wrap = document.getElementById('growth-form');
    if (!wrap) return;
    const child = activeChild();
    const m = METRICS[metric];

    if (!child) {
      wrap.innerHTML = Components.emptyState({
        icon: 'baby', title: 'Add a child profile first',
        subtitle: 'Head to Profile to add your little one.',
      });
      return;
    }

    wrap.innerHTML = `
      <form id="growth-log-form">
        <div class="field">
          <label for="growth-value">${m.label} (${m.unit})</label>
          <input type="number" step="${m.step}" id="growth-value" placeholder="${m.placeholder}" required>
        </div>
        <div class="field">
          <label for="growth-note">Note (optional)</label>
          <input type="text" id="growth-note" placeholder="Anything worth remembering">
        </div>
        <button class="btn btn--primary" type="submit">${Icons.plus} Log ${m.label}</button>
      </form>`;

    document.getElementById('growth-log-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const value = Number(document.getElementById('growth-value').value);
      if (!value) { UI.toast(`Enter a ${m.label.toLowerCase()} to log.`, 'error'); return; }

      Storage.pushItem('logs', {
        id: Utils.uid(), childId: child.id, type: metric, value,
        note: document.getElementById('growth-note').value.trim(),
        timestamp: Utils.nowISO(),
      });
      UI.toast(`${m.label} logged ✓`, 'success');
      render();
    });
  }

  /* ---------------- chart ---------------- */

  function renderChart() {
    const wrap = document.getElementById('growth-chart-wrap');
    const canvas = document.getElementById('growth-chart');
    const title = document.getElementById('growth-chart-title');
    const icon = document.getElementById('growth-chart-icon');
    const empty = document.getElementById('growth-chart-empty');
    if (!wrap || !canvas) return;

    const m = METRICS[metric];
    if (title) title.textContent = `${m.label} Over Time`;
    if (icon) icon.innerHTML = Icons[m.icon];

    const points = logsOf(metric).slice(-12);

    // A single reading has no trend to draw, so say that plainly rather
    // than rendering a chart with one dot on it.
    if (points.length < 2) {
      canvas.style.display = 'none';
      if (empty) {
        empty.style.display = 'block';
        empty.textContent = points.length
          ? 'Log one more reading to see the trend.'
          : `No ${m.label.toLowerCase()} readings yet.`;
      }
      return;
    }

    canvas.style.display = 'block';
    if (empty) empty.style.display = 'none';
    Charts.lineChart(
      canvas,
      points.map(p => Utils.formatDate(p.timestamp)),
      points.map(p => p.value)
    );
    Charts.attachPointClickHandler(canvas, (pt) => {
      UI.toast(`${pt.label}: ${pt.value} ${m.unit}`);
    });
  }

  /* ---------------- history ---------------- */

  function renderHistory() {
    const wrap = document.getElementById('growth-history');
    if (!wrap) return;
    const m = METRICS[metric];
    const logs = logsOf(metric).slice().reverse().slice(0, 30);

    wrap.innerHTML = logs.length ? logs.map(l => `
      <div class="log-item">
        <div class="log-icon">${Icons[m.icon]}</div>
        <div class="log-info">
          <div class="log-title">${Utils.escapeHtml(String(l.value))} ${m.unit}</div>
          <div class="log-meta">${Utils.formatDateTime(l.timestamp)}${l.note ? ' · ' + Utils.escapeHtml(l.note) : ''}</div>
        </div>
        <button class="icon-btn" data-delete-growth="${l.id}" aria-label="Delete entry">${Icons.trash}</button>
      </div>`).join('') : Components.emptyState({
        icon: m.icon, title: `No ${m.label.toLowerCase()} entries yet`,
        subtitle: 'Log one above to start the chart.',
      });

    wrap.querySelectorAll('[data-delete-growth]').forEach(btn =>
      btn.addEventListener('click', async () => {
        const ok = await UI.confirmDialog({
          title: 'Delete entry?', message: 'This reading will be permanently removed.',
          confirmLabel: 'Delete', danger: true,
        });
        if (ok) { Storage.removeItem('logs', btn.dataset.deleteGrowth); render(); }
      }));
  }

  function render() {
    renderSummary();
    renderForm();
    renderChart();
    renderHistory();
  }

  function init(initialMetric) {
    if (initialMetric && METRICS[initialMetric]) metric = initialMetric;
    renderTabs();
    render();
    window.addEventListener('resize', Utils.debounce(renderChart, 200));
  }

  return { init, render };
})();
