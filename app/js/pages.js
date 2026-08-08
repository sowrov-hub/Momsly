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
      <h1>${child ? `How's ${child.name} today?` : 'Welcome to Momsly'}</h1>
      <p>${child ? Utils.ageLabel(child.dob) + ' · your smart parenting companion is watching the details so you don\'t have to.' : 'Add your child\'s profile to start tracking feedings, sleep, and milestones.'}</p>`;

    const statsCard = document.getElementById('hero-stats-card');
    if (statsCard) {
      statsCard.innerHTML = `
        <div class="hero-stat-item hero-stat-item--feeds">
          <div class="hero-stat-item__icon-wrap">
            <span class="hero-stat-item__icon">${Icons.bottle}</span>
            <span class="hero-stat-item__sparkle">${Icons.heart}</span>
          </div>
          <b>${feedSummary.count}</b><span>Feeds today</span>
          <div class="hero-stat-item__underline"></div>
        </div>
        <div class="hero-stat-item hero-stat-item--naps">
          <div class="hero-stat-item__icon-wrap">
            <span class="hero-stat-item__icon">${Icons.sleep}</span>
            <span class="hero-stat-item__sparkle">${Icons.sparkles}</span>
          </div>
          <b>${sleepSummary.count}</b><span>Naps today</span>
          <div class="hero-stat-item__underline"></div>
        </div>
        <div class="hero-stat-item hero-stat-item--sleep">
          <div class="hero-stat-item__icon-wrap">
            <span class="hero-stat-item__icon">${Icons.moon}</span>
            <span class="hero-stat-item__sparkle">${Icons.sparkles}</span>
          </div>
          <b>${Utils.durationLabel(sleepSummary.totalMs)}</b><span>Sleep today</span>
          <div class="hero-stat-item__underline"></div>
        </div>`;
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

  function renderTodaySummary() {
    const el = document.getElementById('today-summary');
    if (!el) return;
    const child = activeChild();
    const reminders = Scheduler.list().filter(r => r.enabled).slice(0, 3);
    const cards = [];

    // AI Daily Planner — if a plan was generated today, surface it as its
    // own dashboard card rather than making the mom regenerate it.
    const plan = Storage.get('dailyPlan');
    if (plan && plan.date === Utils.todayKey()) {
      cards.push(summaryCard({
        icon: 'sparkles', title: "Today's Plan",
        meta: `${plan.schedule.length} steps · generated ${Utils.relativeTime(plan.generatedAt)}`,
        value: '', kind: 'planner',
      }));
    }

    if (child) {
      const nextFeed = Feeding.nextFeedPrediction(child.id);
      if (nextFeed) {
        cards.push(summaryCard({
          icon: 'bottle', title: 'Next feed',
          meta: nextFeed > new Date() ? `~${Utils.formatTime(nextFeed)}` : 'Due now',
          value: Utils.formatTime(nextFeed),
          kind: 'prediction',
        }));
      }
    }

    reminders.forEach(r => cards.push(summaryCard({
      icon: r.icon, title: r.title,
      meta: scheduleLabel(r),
      value: '',
      kind: 'reminder', id: r.id,
    })));

    // Milestones logged today — a nice "look what happened today" recap.
    if (child) {
      const todaysMilestones = Milestones.list(child.id).filter(m => Utils.isToday(m.date));
      todaysMilestones.forEach(m => cards.push(summaryCard({
        icon: 'milestone', title: m.title,
        meta: 'Milestone logged today',
        value: '', kind: 'milestone', id: m.id,
      })));
    }

    el.innerHTML = cards.length ? cards.join('') : Components.emptyState({ icon: 'schedule', title: 'Nothing scheduled', subtitle: 'Add a reminder to see it here.' });

    el.querySelectorAll('[data-summary-card]').forEach(card => {
      card.addEventListener('click', () => {
        const kind = card.dataset.kind;
        if (kind === 'reminder') openReminderDetail(card.dataset.id);
        else if (kind === 'planner') openPlannerDetail();
        else if (kind === 'milestone') openMilestoneDetail(card.dataset.id);
        else openNextFeedDetail();
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
      renderTodaySummary();
    };
    document.getElementById('today-detail-delete').onclick = async () => {
      const ok = await UI.confirmDialog({ title: 'Delete reminder?', message: `"${reminder.title}" will be permanently removed.`, confirmLabel: 'Delete', danger: true });
      if (ok) {
        Scheduler.remove(id);
        UI.closeSheet('sheet-today-detail');
        renderTodaySummary();
      }
    };

    UI.openSheet('sheet-today-detail');
  }

  function openNextFeedDetail() {
    const child = activeChild();
    const body = document.getElementById('today-detail-body');
    const title = document.getElementById('today-detail-title');
    if (!body || !title || !child) return;
    const nextFeed = Feeding.nextFeedPrediction(child.id);

    title.textContent = 'Next Feed Prediction';
    body.innerHTML = `
      <div class="summary-icon" style="width:56px;height:56px;margin:0 auto var(--space-md);">${Icons.bottle}</div>
      <p style="text-align:center;font-weight:700;font-size:var(--fs-md);margin-bottom:4px;">${nextFeed ? 'Predicted around ' + Utils.formatDateTime(nextFeed) : 'Not enough data yet'}</p>
      <p class="subtext" style="text-align:center;margin-bottom:var(--space-lg);">Estimated from the average gap between ${child.name}'s recent logged feeds — not a fixed reminder, just a helpful guess.</p>
      <a class="btn btn--primary" href="tracker.html?tab=feeding">${Icons.bottle} Log a Feed Now</a>`;

    UI.openSheet('sheet-today-detail');
  }

  function openPlannerDetail() {
    const plan = Storage.get('dailyPlan');
    const body = document.getElementById('today-detail-body');
    const title = document.getElementById('today-detail-title');
    if (!body || !title || !plan) return;

    const iconFor = { feeding: 'bottle', sleep: 'sleep', activity: 'activity' };
    title.textContent = "Today's Plan";
    body.innerHTML = `
      <p class="subtext" style="text-align:center;margin-bottom:var(--space-md);">Generated ${Utils.relativeTime(plan.generatedAt)}</p>
      <div class="card" style="margin-bottom:var(--space-md);">${plan.schedule.map(s => `
        <div class="log-item"><div class="log-icon">${Icons[iconFor[s.type]] || Icons.sparkles}</div>
        <div class="log-info"><div class="log-title">${Utils.escapeHtml(s.label)}</div></div>
        <div class="log-value">${Utils.escapeHtml(s.time)}</div></div>`).join('')}</div>
      <a class="btn btn--secondary" href="tools.html#ai-planner">${Icons.sparkles} Regenerate Plan</a>`;

    UI.openSheet('sheet-today-detail');
  }

  function openMilestoneDetail(id) {
    const child = activeChild();
    const milestone = child ? Milestones.list(child.id).find(m => m.id === id) : null;
    const body = document.getElementById('today-detail-body');
    const title = document.getElementById('today-detail-title');
    if (!body || !title || !milestone) return;

    title.textContent = milestone.title;
    body.innerHTML = `
      <div class="summary-icon" style="width:56px;height:56px;margin:0 auto var(--space-md);">${Icons.milestone}</div>
      <p style="text-align:center;font-weight:700;font-size:var(--fs-md);margin-bottom:4px;">${Utils.formatDate(milestone.date)}</p>
      ${milestone.note ? `<p class="subtext" style="text-align:center;margin-bottom:var(--space-lg);">${Utils.escapeHtml(milestone.note)}</p>` : '<div style="margin-bottom:var(--space-lg);"></div>'}
      <a class="btn btn--secondary" href="tools.html#milestones">${Icons.milestone} View Milestone Timeline</a>`;

    UI.openSheet('sheet-today-detail');
  }

  function renderRecentTools() {
    const el = document.getElementById('recent-tools');
    if (!el) return;
    const favs = Storage.get('favorites') || [];
    const featured = favs.length
      ? Data.TOOLS.filter(t => favs.includes(t.id)).slice(0, 4)
      : Data.TOOLS.slice(0, 4);
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
    renderTodaySummary();
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
        }
      });
    });
  }

  function addChild({ name, dob, sex }) {
    const children = Storage.get('children') || [];
    const child = {
      id: Utils.uid(), name, dob, sex,
      avatarColor: Data.AVATAR_COLORS[children.length % Data.AVATAR_COLORS.length],
      createdAt: Utils.nowISO(),
    };
    Storage.pushItem('children', child);
    if (!Storage.get('activeChildId')) Storage.set('activeChildId', child.id);
    renderChildren();
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
    renderSettingsToggles();
  }

  return { init, addChild, renderChildren, renderHeader, setPhoto, removePhoto };
})();
