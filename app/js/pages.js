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
      <p>${child ? Utils.ageLabel(child.dob) + ' · your smart parenting companion is watching the details so you don\'t have to.' : 'Add your child\'s profile to start tracking feedings, sleep, and milestones.'}</p>
      <div class="hero-stats">
        <div class="hero-stat"><b>${feedSummary.count}</b><span>Feeds today</span></div>
        <div class="hero-stat"><b>${sleepSummary.count}</b><span>Naps today</span></div>
        <div class="hero-stat"><b>${Utils.durationLabel(sleepSummary.totalMs)}</b><span>Sleep today</span></div>
      </div>`;
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

    if (child) {
      const nextFeed = Feeding.nextFeedPrediction(child.id);
      if (nextFeed) {
        cards.push(summaryCard('bottle', 'Next feed', nextFeed > new Date() ? `~${Utils.formatTime(nextFeed)}` : 'Due now', Utils.formatTime(nextFeed)));
      }
    }
    reminders.forEach(r => cards.push(summaryCard(r.icon, r.title, r.repeat === 'interval' ? `Every ${r.every} min` : 'Scheduled', '')));

    el.innerHTML = cards.length ? cards.join('') : Components.emptyState({ icon: 'schedule', title: 'Nothing scheduled', subtitle: 'Add a reminder to see it here.' });
  }

  function summaryCard(icon, title, meta, value) {
    return `
      <div class="card card-row summary-card" style="margin-bottom:12px;">
        <div class="summary-icon">${Icons[icon] || Icons.sparkles}</div>
        <div><div class="summary-title">${Utils.escapeHtml(title)}</div><div class="summary-meta">${Utils.escapeHtml(meta)}</div></div>
        ${value ? `<div class="summary-value">${Utils.escapeHtml(value)}</div>` : ''}
      </div>`;
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
    el.innerHTML = `
      <div class="avatar">${Utils.initials(user?.name)}</div>
      <div class="profile-name">${Utils.escapeHtml(user?.name || 'Momsly Parent')}</div>
      <div class="profile-meta">${Utils.escapeHtml(user?.email || '')}</div>
      <span class="badge ${info.isPremium ? 'badge--premium' : 'badge--new'}" style="margin-top:8px;">
        ${info.isPremium ? Icons.crown + ' Lifetime Premium' : (info.expired ? 'Trial ended' : info.daysLeft + ' days left in trial')}
      </span>`;
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
        if (e.target.checked) await NotificationService.requestPermission();
        const s = Storage.get('settings') || {};
        s.notifications = e.target.checked;
        Storage.set('settings', s);
      });
    }
  }

  function init() {
    renderHeader();
    renderChildren();
    renderSettingsToggles();
  }

  return { init, addChild, renderChildren };
})();
