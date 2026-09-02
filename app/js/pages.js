/* ==========================================================================
   MOMSLY — PAGES
   Controllers for pages that aren't complex enough to earn their own
   file: the Home dashboard, Saved (favorites), and Profile screens.
   ========================================================================== */

const HomePage = (() => {
  function activeChild() {
    const children = Storage.get('children') || [];
    const activeId = Storage.get('activeChildId');
    return children.find(c => c.id === activeId) || children[0] || null;
  }

  function renderHero() {
    const el = document.getElementById('home-hero');
    if (!el) return;
    const child = activeChild();
    const feedSummary = child ? Feeding.todaySummary(child.id) : { count: 0, totalOz: 0 };
    const sleepSummary = child ? Sleep.todaySummary(child.id) : { count: 0, totalMs: 0 };
    el.innerHTML = `
      <div class="hero-eyebrow">${App.greeting()}</div>
      <h1>Your Every Step In Parenting Matters</h1>`;

    const statsCard = document.getElementById('hero-stats-card');
    if (statsCard) {
      const stat = (modifier, icon, value, label) => `
        <div class="hero-stat hero-stat--${modifier}">
          <div class="hero-stat__value">${value}</div>
          <div class="hero-stat__label">${label}</div>
          <span class="hero-stat__icon"><img src="assets/images/icon-${icon}.png" alt=""></span>
        </div>`;

      statsCard.innerHTML = [
        stat('feeds', 'feeds', feedSummary.count, 'Feeds today'),
        stat('naps', 'naps', sleepSummary.count, 'Naps today'),
        stat('sleep', 'sleep', Utils.durationLabel(sleepSummary.totalMs), 'Sleep today'),
      ].join('');
    }
  }

  function renderQuickActions() {
    const el = document.getElementById('quick-actions');
    if (!el) return;
    const actions = [
      { icon: 'bottle', label: 'Feed', href: 'tracker.html?tab=feeding' },
      { icon: 'sleep', label: 'Sleep', href: 'tracker.html?tab=sleep' },
      { icon: 'diaper', label: 'Diaper', href: 'tracker.html?tab=diaper' },
      { icon: 'bell', label: 'Remind', href: 'tools.html#reminders' },
    ];
    el.innerHTML = actions.map(a => `
      <a class="quick-action" href="${a.href}">
        <span class="qa-icon">${Icons[a.icon]}</span>
        <span>${a.label}</span>
      </a>`).join('');
  }

  // Upcoming Reminders — every enabled reminder that hasn't already been
  // handled for its current cycle, soonest-due first. A completed
  // one-time reminder never comes back; a completed daily/interval
  // reminder's next-fire time moves into the future, which naturally
  // pushes it out of view until it's relevant again.
  function renderUpcomingReminders() {
    const el = document.getElementById('today-summary');
    if (!el) return;
    const now = new Date();

    // Two different things share this list: recurring reminders (which
    // notify) and dated doctor's appointments (which don't). Both are
    // sorted together by when they actually come up next.
    const reminders = Scheduler.list()
      .filter(r => r.enabled && !(r.repeat === 'once' && r.lastFiredAt))
      .map(r => ({ kind: 'reminder', at: Scheduler.nextFireTime(r, now), item: r }));

    const appts = (typeof Appointments !== 'undefined' ? Appointments.upcoming(5) : [])
      .map(a => ({ kind: 'appointment', at: new Date(a.when), item: a }));

    const upcoming = [...reminders, ...appts].sort((a, b) => a.at - b.at).slice(0, 4);

    el.innerHTML = upcoming.length
      ? upcoming.map(({ kind, item, at }) => kind === 'appointment'
          ? summaryCard({
              icon: 'calendar', title: item.title,
              meta: [Utils.formatDateTime(at), item.doctor].filter(Boolean).join(' · '),
              value: '', kind: 'appointment', id: item.id,
            })
          : summaryCard({
              icon: item.icon, title: item.title,
              meta: scheduleLabel(item),
              value: '', kind: 'reminder', id: item.id,
            })).join('')
      : Components.emptyState({ icon: 'bell', title: 'Nothing coming up', subtitle: 'Add a reminder or an appointment from Tools.' });

    el.querySelectorAll('[data-summary-card]').forEach(card => {
      card.addEventListener('click', () => {
        if (card.dataset.kind === 'appointment') window.location.href = 'tools.html#doctor-appointment';
        else openReminderDetail(card.dataset.id);
      });
    });
  }

  function scheduleLabel(r) {
    if (r.repeat === 'interval') return `Every ${r.every} min`;
    if (r.repeat === 'daily') return `Daily · ${Utils.formatTime(r.time)}`;
    return Utils.formatDateTime(r.time);
  }

  function summaryCard({ icon, title, meta, value, kind, id }) {
    return `
      <div class="card card-row summary-card" style="margin-bottom:12px;cursor:pointer;" data-summary-card data-kind="${kind}" ${id ? `data-id="${id}"` : ''}>
        <div class="summary-icon">${Icons[icon] || Icons.sparkles}</div>
        <div><div class="summary-title">${Utils.escapeHtml(title)}</div><div class="summary-meta">${Utils.escapeHtml(meta)}</div></div>
        ${value ? `<div class="summary-value">${Utils.escapeHtml(value)}</div>` : ''}
        <span style="margin-left:auto;color:var(--color-subtext);flex-shrink:0;">${Icons.chevronRight}</span>
      </div>`;
  }

  function openReminderDetail(id) {
    const reminder = Scheduler.list().find(r => r.id === id);
    if (!reminder) return;
    const body = document.getElementById('today-detail-body');
    const title = document.getElementById('today-detail-title');
    if (!body || !title) return;

    title.textContent = reminder.title;
    const scheduleText = reminder.repeat === 'interval'
      ? `Repeats every ${reminder.every} minutes`
      : reminder.repeat === 'daily'
        ? `Repeats daily at ${Utils.formatTime(reminder.time)}`
        : `Scheduled for ${Utils.formatDateTime(reminder.time)}`;

    body.innerHTML = `
      <div class="summary-icon" style="width:56px;height:56px;margin:0 auto var(--space-md);">${Icons[reminder.icon] || Icons.bell}</div>
      <p style="text-align:center;font-weight:700;font-size:var(--fs-md);margin-bottom:4px;">${scheduleText}</p>
      <p class="subtext" style="text-align:center;margin-bottom:var(--space-lg);">${reminder.enabled ? 'This reminder is on.' : 'This reminder is currently paused.'}${reminder.lastFiredAt ? ' · Last fired ' + Utils.relativeTime(reminder.lastFiredAt) : ''}</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="btn btn--secondary" id="today-detail-snooze">${Icons.moon} Snooze 10 Minutes</button>
        <button class="btn btn--secondary" id="today-detail-done">${Icons.check} Mark Done for Today</button>
        <button class="btn btn--danger" id="today-detail-delete">${Icons.trash} Delete Reminder</button>
      </div>`;

    document.getElementById('today-detail-snooze').onclick = () => {
      Scheduler.snooze(id, 10);
      UI.toast('Snoozed for 10 minutes.', 'success');
      UI.closeSheet('sheet-today-detail');
    };
    document.getElementById('today-detail-done').onclick = () => {
      Scheduler.markDone(id);
      UI.toast('Marked done for today.', 'success');
      UI.closeSheet('sheet-today-detail');
      renderUpcomingReminders();
    };
    document.getElementById('today-detail-delete').onclick = async () => {
      const ok = await UI.confirmDialog({ title: 'Delete reminder?', message: `"${reminder.title}" will be permanently removed.`, confirmLabel: 'Delete', danger: true });
      if (ok) {
        Scheduler.remove(id);
        UI.closeSheet('sheet-today-detail');
        renderUpcomingReminders();
      }
    };

    UI.openSheet('sheet-today-detail');
  }

  function renderBabyExpensesSection() {
    const section = document.getElementById('baby-expenses-section');
    if (!section) return;
    const budget = Storage.get('budget') || { entries: [] };
    const total = budget.entries.reduce((s, e) => s + e.amount, 0);
    const sorted = budget.entries.slice().reverse();

    section.innerHTML = `
      <div class="card" style="text-align:center;background:var(--gradient-soft);margin-bottom:var(--space-sm);">
        <div class="subtext">Total spent</div>
        <div style="font-family:var(--font-display);font-size:1.75rem;color:var(--color-primary);">$${total.toFixed(2)}</div>
      </div>
      <div class="log-list" style="margin-bottom:var(--space-sm);">
        ${sorted.length ? sorted.slice(0, 6).map(e => `
          <div class="log-item">
            <div class="log-icon">${Icons.wallet}</div>
            <div class="log-info"><div class="log-title">${Utils.escapeHtml(e.label)}</div><div class="log-meta">${Utils.escapeHtml(e.category)} · ${Utils.formatDate(e.date)}</div></div>
            <div class="log-value">$${e.amount.toFixed(2)}</div>
          </div>`).join('') : Components.emptyState({ icon: 'wallet', title: 'No expenses logged', subtitle: 'Track what baby costs, one entry at a time.' })}
      </div>
      <a class="btn btn--primary" href="tools.html#expense-tracker">${Icons.wallet} Add an Expense</a>`;
  }

  function renderGrowthTrends() {
    const section = document.getElementById('growth-trends-section');
    if (!section) return;
    section.style.display = 'block';
    const child = activeChild();

    const allLogs = Storage.get('logs') || [];
    const weightLogs = child ? allLogs.filter(l => l.type === 'weight' && l.childId === child.id).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];
    const heightLogs = child ? allLogs.filter(l => l.type === 'height' && l.childId === child.id).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];

    const weightIcon = document.getElementById('home-weight-icon');
    const heightIcon = document.getElementById('home-height-icon');
    if (weightIcon) weightIcon.innerHTML = Icons.weight;
    if (heightIcon) heightIcon.innerHTML = Icons.ruler;

    const weightLatestEl = document.getElementById('home-weight-latest');
    const weightCanvas = document.getElementById('home-weight-chart');
    if (weightLogs.length >= 2) {
      const latest = weightLogs[weightLogs.length - 1];
      if (weightLatestEl) weightLatestEl.innerHTML = `${latest.value}<span>lb</span>`;
      const points = weightLogs.slice(-8);
      Charts.lineChart(weightCanvas, points.map(p => Utils.formatDate(p.timestamp)), points.map(p => p.value));
    } else {
      if (weightLatestEl) weightLatestEl.innerHTML = `<span style="font-size:11px;color:var(--color-subtext);">No data yet</span>`;
      const ctx = weightCanvas?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, weightCanvas.width, weightCanvas.height);
    }

    const heightLatestEl = document.getElementById('home-height-latest');
    const heightCanvas = document.getElementById('home-height-chart');
    if (heightLogs.length >= 2) {
      const latest = heightLogs[heightLogs.length - 1];
      if (heightLatestEl) heightLatestEl.innerHTML = `${latest.value}<span>in</span>`;
      const points = heightLogs.slice(-8);
      Charts.lineChart(heightCanvas, points.map(p => Utils.formatDate(p.timestamp)), points.map(p => p.value));
    } else {
      if (heightLatestEl) heightLatestEl.innerHTML = `<span style="font-size:11px;color:var(--color-subtext);">No data yet</span>`;
      const ctx = heightCanvas?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, heightCanvas.width, heightCanvas.height);
    }
  }

  function renderRecentTools() {
    const el = document.getElementById('recent-tools');
    if (!el) return;
    const favs = Storage.get('favorites') || [];
    // Favorited tools always show first. After that, a few tools are
    // pinned to appear by default (Learn & Fun, Sleep Training, Baby
    // Exercise) so they stay visible even with no favorites yet — then
    // the rest of the catalog fills any remaining slots. Never fewer
    // than 4 shown; favoriting a tool no longer wipes out the others.
    const PINNED_DEFAULT_IDS = ['learn-and-fun', 'sleep-training', 'baby-exercise'];
    const favTools = Data.TOOLS.filter(t => favs.includes(t.id));
    const pinnedTools = Data.TOOLS.filter(t => PINNED_DEFAULT_IDS.includes(t.id) && !favs.includes(t.id));
    const usedIds = new Set([...favTools, ...pinnedTools].map(t => t.id));
    const fillerTools = Data.TOOLS.filter(t => !usedIds.has(t.id));
    const featured = [...favTools, ...pinnedTools, ...fillerTools].slice(0, 4);
    const premiumActive = Auth.isPremiumActive();
    el.innerHTML = featured.map(t => Components.toolCard(t, { isFavorite: favs.includes(t.id), isLocked: t.premium && !premiumActive })).join('');
  }

  function renderTip() {
    const el = document.getElementById('daily-tip');
    if (!el) return;
    el.innerHTML = `
      <div class="card tip-card">
        <div class="eyebrow">${Icons.sparkles} Daily tip</div>
        <p style="margin-top:8px;font-size:14px;line-height:1.6;">${Data.tipOfTheDay()}</p>
      </div>`;
  }

  function renderTrialBanner() {
    const el = document.getElementById('trial-banner-mount');
    if (el) el.innerHTML = App.trialBannerHTML();
  }

  function init() {
    renderTrialBanner();
    renderHero();
    renderQuickActions();
    Calendar.init();
    renderGrowthTrends();
    renderUpcomingReminders();
    renderBabyExpensesSection();
    renderTip();
    renderRecentTools();
  }

  return { init };
})();

const SavedPage = (() => {
  function render() {
    const grid = document.getElementById('saved-grid');
    if (!grid) return;
    const favs = Storage.get('favorites') || [];
    const tools = Data.TOOLS.filter(t => favs.includes(t.id));
    const premiumActive = Auth.isPremiumActive();
    grid.innerHTML = tools.length
      ? tools.map(t => Components.toolCard(t, { isFavorite: true, isLocked: t.premium && !premiumActive })).join('')
      : Components.emptyState({ icon: 'saved', title: 'Nothing saved yet', subtitle: 'Tap the heart on any tool to save it here.' });
  }
  function init() { render(); }
  return { init, render };
})();

const ProfilePage = (() => {
  function renderHeader() {
    const el = document.getElementById('profile-header');
    if (!el) return;
    const user = Auth.currentUser();
    const info = Auth.trialInfo();
    const photo = Storage.get('profilePhoto');
    el.innerHTML = `
      <div class="avatar-upload-wrap">
        <div class="avatar">${photo ? `<img src="${photo}" alt="Profile photo">` : Utils.initials(user?.name)}</div>
        <button class="avatar-edit-btn" id="avatar-edit-btn" type="button" aria-label="Change profile photo">${Icons.camera}</button>
      </div>
      <div class="profile-name">${Utils.escapeHtml(user?.name || 'Momsly Parent')}</div>
      <div class="profile-meta">${Utils.escapeHtml(user?.email || '')}</div>
      <span class="badge ${info.isPremium ? 'badge--premium' : 'badge--new'}" style="margin-top:8px;">
        ${info.isPremium ? Icons.crown + ' Lifetime Premium' : (info.expired ? 'Trial ended' : info.daysLeft + ' days left in trial')}
      </span>
      ${photo ? `<button class="btn btn--ghost btn--sm" id="remove-avatar-btn" type="button" style="margin-top:6px;">Remove Photo</button>` : ''}`;
  }

  function setPhoto(dataUrl) {
    Storage.set('profilePhoto', dataUrl);
    renderHeader();
  }

  function removePhoto() {
    Storage.set('profilePhoto', null);
    renderHeader();
  }

  function activeChild() {
    const children = Storage.get('children') || [];
    const activeId = Storage.get('activeChildId');
    return children.find(c => c.id === activeId) || children[0] || null;
  }

  function latestLog(childId, type) {
    return (Storage.get('logs') || [])
      .filter(l => l.type === type && l.childId === childId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;
  }

  // Full detail card for whichever child is currently active: identity,
  // their latest logged weight/height (pulled straight from the tracker
  // history so there's only ever one source of truth), a free-text blood
  // group the parent types in here, and their most recent milestones.
  function renderBabyDetails() {
    const el = document.getElementById('baby-details');
    if (!el) return;
    const child = activeChild();
    if (!child) {
      el.innerHTML = Components.emptyState({ icon: 'baby', title: 'No baby profile yet', subtitle: 'Add a child above to see their details here.' });
      return;
    }

    const weight = latestLog(child.id, 'weight');
    const height = latestLog(child.id, 'height');
    const milestones = Milestones.list(child.id).slice(0, 3);
    const sexLabel = { female: 'Girl', male: 'Boy' }[child.sex] || '';

    const statPill = (label, log, unit) => `
      <div class="stat-pill">
        <span>${label}</span>
        <b>${log ? Utils.escapeHtml(String(log.value)) + ' ' + unit : '—'}</b>
        <span>${log ? Utils.formatDate(log.timestamp) : 'Not logged yet'}</span>
      </div>`;

    el.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-sm);">
        <div class="card-row" style="margin-bottom:var(--space-md);">
          ${Components.childAvatar(child)}
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:var(--fs-md);">${Utils.escapeHtml(child.name)}</div>
            <div class="subtext">${Utils.ageLabel(child.dob)}${sexLabel ? ' · ' + sexLabel : ''}${child.dob ? ' · born ' + Utils.formatDate(child.dob) : ''}</div>
          </div>
        </div>

        <div class="stat-row" style="margin-bottom:var(--space-md);">
          ${statPill('Weight', weight, 'lb')}
          ${statPill('Height', height, 'in')}
        </div>

        <div class="field" style="margin-bottom:0;">
          <label for="baby-blood-group">Blood group</label>
          <input type="text" id="baby-blood-group" list="blood-groups" autocomplete="off"
            placeholder="Type it in — e.g. O+" value="${Utils.escapeHtml(child.bloodGroup || '')}">
          <div class="field-hint">Saved to ${Utils.escapeHtml(child.name)}'s profile as you type it in.</div>
        </div>
      </div>

      <div class="section-head" style="margin-bottom:var(--space-sm);">
        <h2 style="font-size:var(--fs-md);">Recent milestones</h2>
        <a class="link" href="tools.html#milestones">See all</a>
      </div>
      <div class="log-list">
        ${milestones.length ? milestones.map(m => `
          <div class="log-item">
            <div class="log-icon">${Icons.milestone}</div>
            <div class="log-info">
              <div class="log-title">${Utils.escapeHtml(m.title)}</div>
              <div class="log-meta">${Utils.formatDate(m.date)}${m.note ? ' · ' + Utils.escapeHtml(m.note) : ''}</div>
            </div>
          </div>`).join('') : Components.emptyState({ icon: 'milestone', title: 'No milestones yet', subtitle: 'Add one from Tools to start the timeline.' })}
      </div>`;

    const bloodInput = document.getElementById('baby-blood-group');
    bloodInput?.addEventListener('change', () => {
      Storage.updateItem('children', child.id, { bloodGroup: bloodInput.value.trim() });
      UI.toast('Blood group saved.', 'success');
    });
  }

  function renderChildren() {
    const el = document.getElementById('children-list');
    if (!el) return;
    const children = Storage.get('children') || [];
    const activeId = Storage.get('activeChildId');
    el.innerHTML = children.length ? children.map(c => `
      <div class="child-chip" data-child-id="${c.id}" style="margin-bottom:8px;cursor:pointer;${c.id === activeId ? 'border-color:var(--color-primary);' : ''}">
        ${Components.childAvatar(c)}
        <div style="flex:1;">
          <div style="font-weight:700;font-size:14px;">${Utils.escapeHtml(c.name)}</div>
          <div class="subtext">${Utils.ageLabel(c.dob)}</div>
        </div>
        ${c.id === activeId ? `<span class="badge badge--success">Active</span>` : ''}
        <button class="icon-btn" data-delete-child="${c.id}" style="width:32px;height:32px;">${Icons.trash}</button>
      </div>`).join('') : Components.emptyState({ icon: 'baby', title: 'No children added', subtitle: 'Add a profile to start tracking.' });

    el.querySelectorAll('.child-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        if (e.target.closest('[data-delete-child]')) return;
        Storage.set('activeChildId', chip.dataset.childId);
        renderChildren();
        renderBabyDetails();
        UI.toast('Active child updated.', 'success');
      });
    });
    el.querySelectorAll('[data-delete-child]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = await UI.confirmDialog({ title: 'Remove child profile?', message: 'This will not delete their logged tracker history.', confirmLabel: 'Remove', danger: true });
        if (ok) {
          Storage.removeItem('children', btn.dataset.deleteChild);
          const remaining = Storage.get('children') || [];
          if (Storage.get('activeChildId') === btn.dataset.deleteChild) {
            Storage.set('activeChildId', remaining[0]?.id || null);
          }
          renderChildren();
          renderBabyDetails();
        }
      });
    });
  }

  function addChild({ name, dob, sex, bloodGroup }) {
    const children = Storage.get('children') || [];
    const child = {
      id: Utils.uid(), name, dob, sex,
      bloodGroup: bloodGroup || '',
      avatarColor: Data.AVATAR_COLORS[children.length % Data.AVATAR_COLORS.length],
      createdAt: Utils.nowISO(),
    };
    Storage.pushItem('children', child);
    if (!Storage.get('activeChildId')) Storage.set('activeChildId', child.id);
    renderChildren();
    renderBabyDetails();
    return child;
  }

  function renderSettingsToggles() {
    const settings = Storage.get('settings') || {};
    const darkToggle = document.getElementById('setting-dark-mode');
    const notifToggle = document.getElementById('setting-notifications');
    if (darkToggle) {
      darkToggle.checked = settings.theme === 'dark';
      darkToggle.addEventListener('change', () => App.toggleTheme());
    }
    if (notifToggle) {
      notifToggle.checked = settings.notifications !== false;
      notifToggle.addEventListener('change', async (e) => {
        if (e.target.checked) {
          await NotificationService.requestPermission();
          // Best-effort: also try to enable true background push so
          // reminders can still arrive when Momsly is fully closed.
          // Silently no-ops if push isn't configured/supported — the
          // existing in-app notification behavior above is unaffected
          // either way.
          if (typeof Push !== 'undefined') Push.subscribeToPush().finally(renderPushStatus);
        }
        const s = Storage.get('settings') || {};
        s.notifications = e.target.checked;
        Storage.set('settings', s);
      });
    }
    renderPushStatus();
  }

  async function renderPushStatus() {
    const el = document.getElementById('push-status-hint');
    if (!el || typeof Push === 'undefined') return;
    if (!Push.isSupported()) {
      el.textContent = 'Background notifications aren\'t supported in this browser — in-app reminders still work while Momsly is open.';
      return;
    }
    if (!Push.isConfigured()) {
      el.textContent = 'Reminders notify you while Momsly is open. Background notifications are not set up yet.';
      return;
    }
    const subscribed = await Push.isSubscribed();
    el.textContent = subscribed
      ? 'Background notifications are on — reminders can reach you even when Momsly is closed.'
      : 'Turn on Notifications above to enable background reminders, even when Momsly is closed.';
  }

  function init() {
    renderHeader();
    renderChildren();
    renderBabyDetails();
    renderSettingsToggles();
  }

  return { init, addChild, renderChildren, renderBabyDetails, renderHeader, setPhoto, removePhoto };
})();
