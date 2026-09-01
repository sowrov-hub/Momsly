/* ==========================================================================
   MOMSLY — LOG CALENDAR
   Huckleberry-style calendar widget for the dashboard: Day / Week / Month
   views over the active child's tracker history, with a timeline of the
   selected day's entries underneath.
   ========================================================================== */

const Calendar = (() => {
  let viewMode = 'week';
  let selectedDate = new Date();
  let monthCursor = new Date();
  let weekCursor = startOfWeek(new Date());

  function activeChild() {
    const children = Storage.get('children') || [];
    const activeId = Storage.get('activeChildId');
    return children.find(c => c.id === activeId) || children[0] || null;
  }

  function startOfWeek(d) {
    const res = new Date(d);
    res.setHours(0, 0, 0, 0);
    res.setDate(res.getDate() - res.getDay());
    return res;
  }

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  function addDays(d, n) {
    const res = new Date(d);
    res.setDate(res.getDate() + n);
    return res;
  }

  function addMonths(d, n) {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
  }

  function typeMeta(type) {
    if (type === 'milestone') return { icon: 'milestone', label: 'Milestone', color: 'primary' };
    return Data.trackerType(type) || { icon: 'sparkles', label: type, color: 'primary' };
  }

  function entriesForChild() {
    const child = activeChild();
    if (!child) return [];
    const logs = (Storage.get('logs') || []).filter(l => l.childId === child.id);
    const milestones = (Storage.get('milestones') || [])
      .filter(m => m.childId === child.id)
      .map(m => ({ ...m, type: 'milestone', timestamp: m.date }));
    return [...logs, ...milestones];
  }

  function entriesOnDate(date) {
    const key = Utils.todayKey(date);
    return entriesForChild()
      .filter(e => e.timestamp && Utils.todayKey(new Date(e.timestamp)) === key)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  function distinctTypesOnDate(date) {
    return [...new Set(entriesOnDate(date).map(e => e.type))];
  }

  function valueLabelFor(entry) {
    switch (entry.type) {
      case 'feeding': case 'pump': case 'water': return `${entry.amount ?? ''} oz`.trim();
      case 'breastfeeding': return `${entry.duration ?? ''} min${entry.side ? ' · ' + entry.side : ''}`;
      case 'sleep': return entry.duration ? Utils.durationLabel(entry.duration) : '';
      case 'diaper': return entry.diaperType || '';
      case 'weight': return entry.value != null ? `${entry.value} lb` : '';
      case 'height': return entry.value != null ? `${entry.value} in` : '';
      case 'temperature': return entry.value != null ? `${entry.value}°F` : '';
      case 'medicine': return [entry.medName, entry.dose].filter(Boolean).join(' · ');
      case 'vaccine': return entry.vaccineName || '';
      case 'mood': return entry.mood || '';
      default: return '';
    }
  }

  function titleLabel() {
    if (viewMode === 'day') {
      return Utils.todayKey(selectedDate) === Utils.todayKey()
        ? 'Today'
        : selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
    if (viewMode === 'week') {
      const end = addDays(weekCursor, 6);
      const sameMonth = weekCursor.getMonth() === end.getMonth();
      const startLabel = weekCursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const endLabel = end.toLocaleDateString(undefined, sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
      return `${startLabel} – ${endLabel}`;
    }
    return monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  function isShowingToday() {
    const now = new Date();
    if (viewMode === 'day') return Utils.todayKey(selectedDate) === Utils.todayKey(now);
    if (viewMode === 'week') return now >= weekCursor && now < addDays(weekCursor, 7);
    return monthCursor.getFullYear() === now.getFullYear() && monthCursor.getMonth() === now.getMonth();
  }

  function timelineHeading() {
    const count = entriesOnDate(selectedDate).length;
    const dateLabel = Utils.todayKey(selectedDate) === Utils.todayKey()
      ? 'Today'
      : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    return `${dateLabel} · ${count} ${count === 1 ? 'entry' : 'entries'}`;
  }

  function bodyHTML() {
    if (!activeChild()) {
      return Components.emptyState({ icon: 'baby', title: 'Add a child profile first', subtitle: 'Head to Profile to add your little one, then your logs will show up here.' });
    }
    if (viewMode === 'week') return weekStripHTML();
    if (viewMode === 'month') return monthGridHTML();
    return '';
  }

  function weekStripHTML() {
    const cells = Array.from({ length: 7 }, (_, i) => addDays(weekCursor, i));
    return `<div class="cal-week-strip">${cells.map(weekCellHTML).join('')}</div>`;
  }

  function weekCellHTML(d) {
    const isSelected = Utils.todayKey(d) === Utils.todayKey(selectedDate);
    const isToday = Utils.todayKey(d) === Utils.todayKey();
    const types = distinctTypesOnDate(d).slice(0, 3);
    return `
      <button class="cal-week-day ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}" data-date="${d.toISOString()}">
        <span class="cal-week-day__label">${d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1)}</span>
        <span class="cal-week-day__num">${d.getDate()}</span>
        <span class="cal-week-day__dots">${types.map(t => `<i class="cal-dot cal-dot--${typeMeta(t).color}"></i>`).join('') || '&nbsp;'}</span>
      </button>`;
  }

  function monthGridHTML() {
    const first = startOfMonth(monthCursor);
    const gridStart = startOfWeek(first);
    const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return `
      <div class="cal-weekday-row">${weekdayLabels.map(l => `<span>${l}</span>`).join('')}</div>
      <div class="cal-month-grid">${cells.map(d => monthCellHTML(d, first)).join('')}</div>`;
  }

  function monthCellHTML(d, first) {
    const inMonth = d.getMonth() === first.getMonth();
    const isSelected = Utils.todayKey(d) === Utils.todayKey(selectedDate);
    const isToday = Utils.todayKey(d) === Utils.todayKey();
    const types = distinctTypesOnDate(d);
    const shown = types.slice(0, 3);
    const overflow = types.length - shown.length;
    return `
      <button class="cal-day-cell ${inMonth ? '' : 'is-outside'} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}" data-date="${d.toISOString()}">
        <span class="cal-day-num">${d.getDate()}</span>
        <span class="cal-day-dots">${shown.map(t => `<i class="cal-dot cal-dot--${typeMeta(t).color}"></i>`).join('')}${overflow > 0 ? `<i class="cal-dot-more">+${overflow}</i>` : ''}</span>
      </button>`;
  }

  // Small "Feeding · 3" style pill row summarizing the selected day's mix
  // of entry types, shown above the timeline list.
  function statPillsHTML() {
    const entries = entriesOnDate(selectedDate);
    if (entries.length < 2) return '';
    const counts = {};
    entries.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return `<div class="cal-stat-pills">${top.map(([type, count]) => {
      const meta = typeMeta(type);
      return `<div class="cal-stat-pill"><span>${Utils.escapeHtml(meta.label)}</span><b class="cal-text--${meta.color}">${count}</b></div>`;
    }).join('')}</div>`;
  }

  function timelineHTML() {
    if (!activeChild()) return '';
    const entries = entriesOnDate(selectedDate);
    if (!entries.length) {
      return Components.emptyState({ icon: 'calendar', title: 'Nothing logged', subtitle: 'No entries for this day yet.' });
    }
    return `<div class="cal-timeline-list">${entries.map(timelineItemHTML).join('')}</div>`;
  }

  function timelineItemHTML(entry) {
    const meta = typeMeta(entry.type);
    const valueLabel = valueLabelFor(entry);
    const metaParts = [Utils.formatTime(entry.timestamp)];
    if (valueLabel) metaParts.push(valueLabel);
    if (entry.note) metaParts.push(entry.note);
    // Milestones live in their own store, so only tracker logs are editable here.
    const editable = entry.type !== 'milestone';
    return `
      <div class="cal-timeline-item">
        <div class="cal-timeline-icon cal-dot--${meta.color}">${Icons[meta.icon] || Icons.sparkles}</div>
        <div class="cal-timeline-content">
          <div class="cal-timeline-title">${Utils.escapeHtml(meta.label)}</div>
          <div class="cal-timeline-meta">${metaParts.map(Utils.escapeHtml).join(' · ')}</div>
        </div>
        ${editable ? `<button class="icon-btn cal-timeline-edit" data-edit-entry="${entry.id}" aria-label="Edit entry">${Icons.edit}</button>` : ''}
      </div>`;
  }

  function render() {
    const mount = document.getElementById('calendar-mount');
    if (!mount) return;
    mount.innerHTML = `
      <div class="card cal-card">
        <div class="cal-toolbar">
          <button class="icon-btn" id="cal-prev" aria-label="Previous">${Icons.chevronLeft}</button>
          <div class="cal-title">
            <div class="cal-title__main">${titleLabel()}</div>
            ${isShowingToday() ? '' : `<button class="cal-today-link" id="cal-today-btn">Today</button>`}
          </div>
          <button class="icon-btn" id="cal-next" aria-label="Next">${Icons.chevronRight}</button>
        </div>
        <div class="segmented cal-segmented">
          <button data-view="day" class="${viewMode === 'day' ? 'active' : ''}">Day</button>
          <button data-view="week" class="${viewMode === 'week' ? 'active' : ''}">Week</button>
          <button data-view="month" class="${viewMode === 'month' ? 'active' : ''}">Month</button>
        </div>
        <div class="cal-body">${bodyHTML()}</div>
      </div>
      <div class="cal-timeline-wrap">
        <div class="cal-timeline-head">
          <h3>${timelineHeading()}</h3>
          <a class="link" href="tracker.html">${Icons.plus} Add</a>
        </div>
        ${statPillsHTML()}
        ${timelineHTML()}
      </div>`;
    bindEvents(mount);
  }

  function step(dir) {
    if (viewMode === 'day') {
      selectedDate = addDays(selectedDate, dir);
    } else if (viewMode === 'week') {
      weekCursor = addDays(weekCursor, dir * 7);
    } else {
      monthCursor = addMonths(monthCursor, dir);
    }
    render();
  }

  function goToday() {
    const now = new Date();
    selectedDate = now;
    monthCursor = now;
    weekCursor = startOfWeek(now);
    render();
  }

  function bindEvents(mount) {
    mount.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        viewMode = btn.dataset.view;
        if (viewMode === 'week') weekCursor = startOfWeek(selectedDate);
        if (viewMode === 'month') monthCursor = new Date(selectedDate);
        render();
      });
    });
    document.getElementById('cal-prev')?.addEventListener('click', () => step(-1));
    document.getElementById('cal-next')?.addEventListener('click', () => step(1));
    document.getElementById('cal-today-btn')?.addEventListener('click', goToday);
    mount.querySelectorAll('[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        selectedDate = new Date(cell.dataset.date);
        render();
      });
    });
    mount.querySelectorAll('[data-edit-entry]').forEach(btn => {
      btn.addEventListener('click', () => LogEditor.open(btn.dataset.editEntry, render));
    });
  }

  function init() {
    const now = new Date();
    selectedDate = now;
    monthCursor = now;
    weekCursor = startOfWeek(now);
    render();
  }

  return { init, render };
})();
