/* ==========================================================================
   MOMSLY — COMPONENTS
   Functions that return HTML strings for repeated UI pieces. Kept
   framework-free: callers set innerHTML and re-bind events as needed.
   ========================================================================== */

const Components = (() => {

  const NAV_ITEMS = [
    { href: 'index.html', icon: 'home', label: 'Home' },
    { href: 'tools.html', icon: 'tools', label: 'Tools' },
    { href: 'tracker.html', icon: 'tracker', label: 'Tracker' },
    { href: 'saved.html', icon: 'saved', label: 'Saved' },
    { href: 'profile.html', icon: 'profile', label: 'Profile' },
  ];

  function bottomNav(activeHref) {
    // Solid icon for the current tab, outline for the rest — the shape
    // itself signals selection, not just the color change.
    const items = NAV_ITEMS.map(item => {
      const isActive = item.href === activeHref;
      return `
      <a class="nav-item ${isActive ? 'active' : ''}" href="${item.href}">
        ${(isActive ? IconsFilled : Icons)[item.icon]}
        <span>${item.label}</span>
      </a>`;
    }).join('');
    return `<nav class="bottom-nav" aria-label="Primary">${items}</nav>`;
  }

  function header({ title, showBack = false, backHref = 'index.html' }) {
    return `
      <header class="app-header">
        <div class="app-header__brand">
          ${showBack ? `<button class="icon-btn" onclick="window.location.href='${backHref}'" aria-label="Back">${Icons.arrowLeft}</button>` : `
          <img class="brand-mark" src="assets/icons/icon-192.png" alt="Momsly">`}
          <span class="app-header__title">${title}</span>
        </div>
        <div class="app-header__actions">
          <button class="icon-btn" id="theme-toggle" aria-label="Toggle dark mode">${Icons.moon}</button>
          <button class="icon-btn" onclick="window.location.href='tools.html#reminders'" aria-label="Reminders">${Icons.bell}</button>
        </div>
      </header>`;
  }

  function toolCard(tool, { isFavorite = false, isLocked = false } = {}) {
    return `
      <a class="tool-card card--interactive ${isLocked ? 'tool-card--locked' : ''}" href="${isLocked ? 'upgrade.html' : tool.route}" data-tool-id="${tool.id}">
        <button class="fav-btn ${isFavorite ? 'is-fav' : ''}" data-fav-toggle="${tool.id}" aria-label="Toggle favorite" onclick="event.preventDefault(); event.stopPropagation(); Tools.toggleFavorite('${tool.id}');">
          ${isFavorite ? Icons.heart : Icons.heart}
        </button>
        <div class="tool-icon">${Icons[tool.icon] || Icons.sparkles}</div>
        <h3>${tool.name}</h3>
        <p>${tool.desc}</p>
      </a>`;
  }

  function logItem(log) {
    const type = Data.trackerType(log.type) || { icon: 'sparkles', label: log.type };
    let valueLabel = '';
    if (log.type === 'feeding' || log.type === 'pump' || log.type === 'water') valueLabel = `${log.amount ?? ''} ${type.unit}`;
    else if (log.type === 'breastfeeding') valueLabel = `${log.duration ?? ''} min`;
    else if (log.type === 'sleep') valueLabel = log.duration ? Utils.durationLabel(log.duration) : '';
    else if (log.type === 'diaper') valueLabel = log.diaperType || '';
    else if (log.type === 'weight') valueLabel = `${log.value ?? ''} lb`;
    else if (log.type === 'height') valueLabel = `${log.value ?? ''} in`;
    else if (log.type === 'temperature') valueLabel = `${log.value ?? ''}°F`;
    else if (log.type === 'medicine') valueLabel = log.medName || '';
    else if (log.type === 'mood') valueLabel = log.mood || '';
    else valueLabel = log.note ? '' : '';

    return `
      <div class="log-item" data-log-id="${log.id}">
        <div class="log-icon">${Icons[type.icon] || Icons.sparkles}</div>
        <div class="log-info">
          <div class="log-title">${type.label || log.type}</div>
          <div class="log-meta">${Utils.formatDateTime(log.timestamp)} · ${Utils.relativeTime(log.timestamp)}</div>
        </div>
        <div class="log-value">${Utils.escapeHtml(valueLabel)}</div>
        <button class="icon-btn" data-edit-log="${log.id}" aria-label="Edit entry">${Icons.edit}</button>
      </div>`;
  }

  function reminderItem(reminder) {
    return `
      <div class="log-item" data-reminder-id="${reminder.id}">
        <div class="log-icon">${Icons[reminder.icon] || Icons.bell}</div>
        <div class="log-info">
          <div class="log-title">${Utils.escapeHtml(reminder.title)}</div>
          <div class="log-meta">${
            reminder.repeat === 'interval' ? `Every ${reminder.every} min`
            : reminder.repeat === 'daily' ? `Daily · ${Utils.formatTime(reminder.time)}`
            : Utils.formatDateTime(reminder.time)
          }</div>
        </div>
        <label class="switch">
          <input type="checkbox" ${reminder.enabled ? 'checked' : ''} data-reminder-toggle="${reminder.id}">
          <span class="track"></span>
        </label>
        <button class="icon-btn" data-delete-reminder="${reminder.id}" aria-label="Delete reminder">${Icons.trash}</button>
      </div>`;
  }

  function milestoneItem(m) {
    return `
      <div class="log-item" data-milestone-id="${m.id}">
        <div class="log-icon">${m.done ? Icons.check : Icons.milestone}</div>
        <div class="log-info">
          <div class="log-title">${Utils.escapeHtml(m.title)}</div>
          <div class="log-meta">${Utils.formatDate(m.date)}${m.note ? ' · ' + Utils.escapeHtml(m.note) : ''}</div>
        </div>
        <button class="icon-btn" data-toggle-milestone="${m.id}" aria-label="Mark complete">${m.done ? Icons.check : Icons.plus}</button>
      </div>`;
  }

  function emptyState({ icon = 'sparkles', title, subtitle }) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${Icons[icon] || Icons.sparkles}</div>
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>`;
  }

  function childAvatar(child) {
    if (!child) return '';
    return `<div class="child-avatar" style="background:${child.avatarColor || '#F472B6'}22;color:${child.avatarColor || '#F472B6'}">${Utils.initials(child.name)}</div>`;
  }

  return { bottomNav, header, toolCard, logItem, reminderItem, milestoneItem, emptyState, childAvatar, NAV_ITEMS };
})();
