/* ==========================================================================
   MOMSLY — TRACKER
   Drives tracker.html: type tabs, the log-entry form (fields differ per
   type), history list, delete, and the two premium timers (feeding/sleep).
   ========================================================================== */

const Tracker = (() => {
  let activeType = 'feeding';
  let feedTimerHandle = null;
  let sleepTimerHandle = null;

  function activeChild() {
    const children = Storage.get('children') || [];
    const activeId = Storage.get('activeChildId');
    return children.find(c => c.id === activeId) || children[0] || null;
  }

  function setActiveType(type) {
    activeType = type;
    renderTabs();
    renderTypeScreen();
  }

  function renderTabs() {
    const wrap = document.getElementById('tracker-tabs');
    if (!wrap) return;
    const premiumActive = Auth.isPremiumActive();
    wrap.innerHTML = Data.TRACKER_TYPES.map(t => `
      <button class="tracker-tab ${t.id === activeType ? 'active' : ''}" data-type="${t.id}">
        <span class="tracker-tab__icon">${Icons[t.icon]}</span>
        <span>${t.label}${t.premium && !premiumActive ? ' 🔒' : ''}</span>
      </button>`).join('');
    wrap.querySelectorAll('.tracker-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const def = Data.trackerType(type);
        if (def.premium && !Auth.isPremiumActive()) { window.location.href = 'upgrade.html'; return; }
        setActiveType(type);
      });
    });
  }

  function renderTypeScreen() {
    renderQuickForm();
    renderTimerCard();
    renderHistory();
    renderChart();
  }

  /* --------- Quick log form (varies by type) --------- */
  function renderQuickForm() {
    const wrap = document.getElementById('quick-form');
    if (!wrap) return;
    const child = activeChild();
    if (!child) {
      wrap.innerHTML = Components.emptyState({ icon: 'baby', title: 'Add a child profile first', subtitle: 'Head to Profile to add your little one.' });
      return;
    }

    const formsByType = {
      feeding: `<div class="field"><label>Amount (oz)</label><input type="number" step="0.5" id="f-amount" placeholder="4"></div>`,
      breastfeeding: `<div class="field"><label>Duration (min)</label><input type="number" id="f-duration" placeholder="15"></div>
        <div class="field"><label>Side</label><select id="f-side"><option value="left">Left</option><option value="right">Right</option><option value="both">Both</option></select></div>`,
      pump: `<div class="field"><label>Output (oz)</label><input type="number" step="0.5" id="f-amount" placeholder="3"></div>`,
      sleep: `<div class="field"><label>Duration (hours)</label><input type="number" step="0.25" id="f-hours" placeholder="1.5"></div>`,
      diaper: `<div class="field"><label>Type</label><select id="f-diaper-type"><option>Wet</option><option>Dirty</option><option>Mixed</option><option>Dry</option></select></div>`,
      medicine: `<div class="field"><label>Medicine name</label><input type="text" id="f-med-name" placeholder="Infant Tylenol"></div>
        <div class="field"><label>Dose</label><input type="text" id="f-dose" placeholder="2.5 mL"></div>`,
      weight: `<div class="field"><label>Weight (lb)</label><input type="number" step="0.1" id="f-value" placeholder="14.2"></div>`,
      height: `<div class="field"><label>Height (in)</label><input type="number" step="0.1" id="f-value" placeholder="24.5"></div>`,
      vaccine: `<div class="field"><label>Vaccine name</label><input type="text" id="f-vaccine-name" placeholder="DTaP"></div>`,
      temperature: `<div class="field"><label>Temperature (°F)</label><input type="number" step="0.1" id="f-value" placeholder="98.6"></div>`,
      mood: `<div class="field"><label>Mood</label><select id="f-mood"><option>Happy</option><option>Fussy</option><option>Calm</option><option>Sleepy</option><option>Sick</option></select></div>`,
      teething: `<div class="field"><label>Note</label><input type="text" id="f-note" placeholder="Which tooth / symptoms"></div>`,
      water: `<div class="field"><label>Amount (oz)</label><input type="number" step="0.5" id="f-amount" placeholder="4"></div>`,
      solids: `<div class="field"><label>Food</label><input type="text" id="f-note" placeholder="Mashed banana"></div>`,
    };

    wrap.innerHTML = `
      <form id="log-form">
        ${formsByType[activeType] || ''}
        <div class="field"><label>Note (optional)</label><input type="text" id="f-generic-note" placeholder="Anything worth remembering"></div>
        <button class="btn btn--primary" type="submit">${Icons.plus} Log ${Data.trackerType(activeType)?.label || ''}</button>
      </form>`;

    document.getElementById('log-form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitLog(child.id);
    });
  }

  function submitLog(childId) {
    const g = (id) => document.getElementById(id)?.value;
    const log = { id: Utils.uid(), childId, type: activeType, timestamp: Utils.nowISO(), note: g('f-generic-note') || g('f-note') || '' };

    switch (activeType) {
      case 'feeding': case 'pump': case 'water':
        log.amount = Number(g('f-amount')) || 0; break;
      case 'breastfeeding':
        log.duration = Number(g('f-duration')) || 0; log.side = g('f-side'); break;
      case 'sleep':
        log.duration = (Number(g('f-hours')) || 0) * 3600000; break;
      case 'diaper':
        log.diaperType = g('f-diaper-type'); break;
      case 'medicine':
        log.medName = g('f-med-name'); log.dose = g('f-dose'); break;
      case 'weight': case 'height': case 'temperature':
        log.value = Number(g('f-value')) || 0; break;
      case 'vaccine':
        log.vaccineName = g('f-vaccine-name'); break;
      case 'mood':
        log.mood = g('f-mood'); break;
    }

    Storage.pushItem('logs', log);
    UI.toast('Logged ✓', 'success');
    renderTypeScreen();
  }

  /* --------- Timer cards for feeding & sleep --------- */
  function renderTimerCard() {
    const wrap = document.getElementById('timer-card-wrap');
    if (!wrap) return;
    if (activeType === 'feeding') { wrap.innerHTML = feedingTimerHTML(); bindFeedingTimer(); }
    else if (activeType === 'sleep') { wrap.innerHTML = sleepTimerHTML(); bindSleepTimer(); }
    else { wrap.innerHTML = ''; clearInterval(feedTimerHandle); clearInterval(sleepTimerHandle); }
  }

  function feedingTimerHTML() {
    const premiumActive = Auth.isPremiumActive();
    if (!premiumActive) {
      return `<div class="card tool-card--locked" style="text-align:center;"><span class="badge badge--premium">${Icons.crown}Premium</span><h3 style="margin-top:8px;">Smart Feeding Timer</h3><p class="subtext">Live timer with next-feed prediction.</p><a href="upgrade.html" class="btn btn--primary" style="margin-top:12px;">Unlock Premium</a></div>`;
    }
    const active = Feeding.getActive();
    const child = activeChild();
    const nextFeed = child ? Feeding.nextFeedPrediction(child.id) : null;
    return `
      <div class="card timer-card ${active ? 'timer-active' : ''}">
        <div class="eyebrow" style="color:rgba(255,255,255,.8)">Smart Feeding Timer</div>
        <div class="timer-display" id="feed-timer-display">${active ? Utils.formatTimer(Feeding.elapsedMs()) : '00:00'}</div>
        ${nextFeed ? `<p style="opacity:.9;font-size:13px;">Next feed around ${Utils.formatTime(nextFeed)}</p>` : ''}
        <div class="timer-controls">
          ${active
            ? `<button class="btn btn--secondary" id="feed-cancel">${Icons.close} Cancel</button><button class="btn" style="background:#fff;color:var(--color-primary);" id="feed-stop">${Icons.stop} Save Feed</button>`
            : `<button class="btn" style="background:#fff;color:var(--color-primary);" id="feed-start">${Icons.play} Start Feeding</button>`}
        </div>
      </div>`;
  }

  function bindFeedingTimer() {
    const child = activeChild();
    document.getElementById('feed-start')?.addEventListener('click', () => {
      if (!child) { UI.toast('Add a child profile first.', 'error'); return; }
      Feeding.start(child.id);
      renderTimerCard();
    });
    document.getElementById('feed-cancel')?.addEventListener('click', () => { Feeding.cancel(); renderTimerCard(); });
    document.getElementById('feed-stop')?.addEventListener('click', async () => {
      const amount = prompt('Amount fed (oz)? Leave blank to skip.');
      Feeding.stop({ amount: amount ? Number(amount) : null });
      UI.toast('Feed saved.', 'success');
      renderTypeScreen();
    });
    clearInterval(feedTimerHandle);
    if (Feeding.getActive()) {
      feedTimerHandle = setInterval(() => {
        const el = document.getElementById('feed-timer-display');
        if (el) el.textContent = Utils.formatTimer(Feeding.elapsedMs());
      }, 1000);
    }
  }

  function sleepTimerHTML() {
    const active = Sleep.getActive();
    const child = activeChild();
    const wake = child ? Sleep.wakePrediction(child.id) : null;
    return `
      <div class="card timer-card ${active ? 'timer-active' : ''}">
        <div class="eyebrow" style="color:rgba(255,255,255,.8)">Smart Sleep Timer</div>
        <div class="timer-display" id="sleep-timer-display">${active ? Utils.formatTimer(Sleep.elapsedMs()) : '00:00'}</div>
        ${wake ? `<p style="opacity:.9;font-size:13px;">Predicted wake around ${Utils.formatTime(wake)}</p>` : ''}
        <div class="timer-controls">
          ${active
            ? `<button class="btn btn--secondary" id="sleep-cancel">${Icons.close} Cancel</button><button class="btn" style="background:#fff;color:var(--color-secondary);" id="sleep-stop">${Icons.stop} Save Sleep</button>`
            : `<button class="btn" style="background:#fff;color:var(--color-secondary);" id="sleep-start">${Icons.play} Start Nap</button>`}
        </div>
      </div>`;
  }

  function bindSleepTimer() {
    const child = activeChild();
    document.getElementById('sleep-start')?.addEventListener('click', () => {
      if (!child) { UI.toast('Add a child profile first.', 'error'); return; }
      Sleep.start(child.id);
      renderTimerCard();
    });
    document.getElementById('sleep-cancel')?.addEventListener('click', () => { Sleep.cancel(); renderTimerCard(); });
    document.getElementById('sleep-stop')?.addEventListener('click', () => {
      const quality = prompt('How was the sleep? (peaceful / normal / restless)', 'normal');
      Sleep.stop({ quality });
      UI.toast('Sleep saved.', 'success');
      renderTypeScreen();
    });
    clearInterval(sleepTimerHandle);
    if (Sleep.getActive()) {
      sleepTimerHandle = setInterval(() => {
        const el = document.getElementById('sleep-timer-display');
        if (el) el.textContent = Utils.formatTimer(Sleep.elapsedMs());
      }, 1000);
    }
  }

  /* --------- History list --------- */
  function renderHistory() {
    const wrap = document.getElementById('history-list');
    if (!wrap) return;
    const child = activeChild();
    const logs = (Storage.get('logs') || [])
      .filter(l => l.type === activeType && (!child || l.childId === child.id))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 30);
    wrap.innerHTML = logs.length ? logs.map(Components.logItem).join('') :
      Components.emptyState({ icon: 'tracker', title: 'No entries yet', subtitle: 'Your logged entries will show up here.' });

    wrap.querySelectorAll('[data-delete-log]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await UI.confirmDialog({ title: 'Delete entry?', message: 'This log entry will be permanently removed.', confirmLabel: 'Delete', danger: true });
        if (ok) { Storage.removeItem('logs', btn.dataset.deleteLog); renderTypeScreen(); }
      });
    });
  }

  /* --------- Chart --------- */
  function renderChart() {
    const canvas = document.getElementById('tracker-chart');
    const wrap = document.getElementById('chart-wrap');
    const statsEl = document.getElementById('chart-stats');
    const iconEl = document.getElementById('chart-icon');
    const titleEl = document.getElementById('chart-title');
    if (!canvas || !wrap) return;
    const child = activeChild();
    const logs = (Storage.get('logs') || []).filter(l => l.type === activeType && (!child || l.childId === child.id));
    const typeDef = Data.trackerType(activeType);

    if (iconEl && typeDef) iconEl.innerHTML = Icons[typeDef.icon] || Icons.sparkles;
    if (titleEl && typeDef) titleEl.textContent = `${typeDef.label} Trends`;

    if (['weight', 'height', 'temperature'].includes(activeType)) {
      const points = logs.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).slice(-12);
      if (points.length < 2) { wrap.style.display = 'none'; return; }
      wrap.style.display = 'block';
      Charts.lineChart(canvas, points.map(p => Utils.formatDate(p.timestamp)), points.map(p => p.value));
      if (statsEl) {
        const latest = points[points.length - 1];
        const diff = latest.value - points[points.length - 2].value;
        const diffLabel = (diff > 0 ? '+' : '') + diff.toFixed(1);
        statsEl.innerHTML = `
          <div class="chart-card__stat"><span>Latest</span><b>${latest.value} ${typeDef.unit || ''}</b></div>
          <div class="chart-card__stat"><span>Since Last</span><b>${diffLabel} ${typeDef.unit || ''}</b></div>`;
      }
    } else if (['feeding', 'sleep', 'diaper', 'water'].includes(activeType)) {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d;
      });
      const values = days.map(d => {
        const key = Utils.todayKey(d);
        return logs.filter(l => Utils.todayKey(new Date(l.timestamp)) === key).length;
      });
      wrap.style.display = 'block';
      Charts.barChart(canvas, days.map(d => d.toLocaleDateString(undefined, { weekday: 'short' })), values);
      if (statsEl) {
        const todayCount = values[values.length - 1];
        const weekCount = values.reduce((a, b) => a + b, 0);
        statsEl.innerHTML = `
          <div class="chart-card__stat"><span>Today</span><b>${todayCount} ${todayCount === 1 ? 'entry' : 'entries'}</b></div>
          <div class="chart-card__stat"><span>This Week</span><b>${weekCount} ${weekCount === 1 ? 'entry' : 'entries'}</b></div>`;
      }
    } else {
      wrap.style.display = 'none';
    }
  }

  function init(initialType) {
    if (initialType && Data.trackerType(initialType)) activeType = initialType;
    renderTabs();
    renderTypeScreen();
    window.addEventListener('resize', Utils.debounce(renderChart, 200));
  }

  return { init, setActiveType };
})();
