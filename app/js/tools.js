/* ==========================================================================
   MOMSLY — TOOLS
   Controls the Tools grid (search/filter/favorite) and every "sheet"
   mini-tool that lives on tools.html: reminders, checklists, mood
   journal, emergency contacts, budget, savings goal, AI planner,
   milestones, breathing exercise, photo memories.
   ========================================================================== */

const Tools = (() => {
  let activeCategory = 'All';
  let searchTerm = '';

  function toggleFavorite(toolId) {
    const favs = Storage.get('favorites') || [];
    const idx = favs.indexOf(toolId);
    if (idx === -1) { favs.push(toolId); UI.toast('Added to Saved.', 'success'); }
    else { favs.splice(idx, 1); UI.toast('Removed from Saved.'); }
    Storage.set('favorites', favs);
    renderGrid();
  }

  function isFavorite(toolId) {
    return (Storage.get('favorites') || []).includes(toolId);
  }

  function filteredTools() {
    const premiumActive = Auth.isPremiumActive();
    return Data.TOOLS.filter(t => {
      const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
      const matchesSearch = !searchTerm || t.name.toLowerCase().includes(searchTerm) || t.desc.toLowerCase().includes(searchTerm);
      return matchesCategory && matchesSearch;
    }).map(t => ({ ...t, locked: t.premium && !premiumActive }));
  }

  function renderGrid() {
    const grid = document.getElementById('tool-grid');
    if (!grid) return;
    const tools = filteredTools();
    if (tools.length === 0) {
      grid.outerHTML = `<div id="tool-grid-empty">${Components.emptyState({ icon: 'search', title: 'No tools found', subtitle: 'Try a different search or category.' })}</div>`;
      return;
    }
    const emptyPlaceholder = document.getElementById('tool-grid-empty');
    if (emptyPlaceholder) {
      emptyPlaceholder.outerHTML = '<div class="tool-grid" id="tool-grid"></div>';
      return renderGrid();
    }
    grid.innerHTML = tools.map(t => Components.toolCard(t, { isFavorite: isFavorite(t.id), isLocked: t.locked })).join('');
  }

  function renderCategoryChips() {
    const row = document.getElementById('category-chips');
    if (!row) return;
    row.innerHTML = Data.TOOL_CATEGORIES.map(c =>
      `<button class="chip ${c === activeCategory ? 'active' : ''}" data-category="${c}">${c}</button>`).join('');
    row.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        activeCategory = chip.dataset.category;
        renderCategoryChips();
        renderGrid();
      });
    });
  }

  function initSearch() {
    const input = document.getElementById('tool-search');
    if (!input) return;
    input.addEventListener('input', Utils.debounce(() => {
      searchTerm = input.value.trim().toLowerCase();
      renderGrid();
    }, 150));
  }

  /* ---------------- Reminders sheet ---------------- */
  function renderReminders() {
    const list = document.getElementById('reminders-list');
    if (!list) return;
    const reminders = Scheduler.list();
    list.innerHTML = reminders.length
      ? reminders.map(Components.reminderItem).join('')
      : Components.emptyState({ icon: 'bell', title: 'No reminders yet', subtitle: 'Add one below to get notified automatically.' });
  }

  function renderReminderPresets() {
    const wrap = document.getElementById('reminder-presets');
    if (!wrap) return;
    wrap.innerHTML = Data.REMINDER_PRESETS.map(p =>
      `<button class="chip" data-preset='${JSON.stringify(p)}'>${p.title}</button>`).join('');
    wrap.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const preset = JSON.parse(chip.dataset.preset);
        document.getElementById('reminder-title').value = preset.title;
        document.getElementById('reminder-category').value = preset.category;
        // Always set the repeat mode explicitly. Previously only interval
        // presets touched it, so picking a one-off preset after an
        // interval one left it stuck on "every N minutes".
        const repeatSel = document.getElementById('reminder-repeat');
        repeatSel.value = preset.every ? 'interval' : (preset.repeat || 'once');
        if (preset.every) document.getElementById('reminder-every').value = preset.every;
        toggleReminderFields();
      });
    });
  }

  // Reminders are time-of-day nudges, so no calendar date is asked for.
  // Anything that genuinely happens on a specific day is a doctor's
  // appointment instead — see js/appointments.js.
  function toggleReminderFields() {
    const repeat = document.getElementById('reminder-repeat')?.value;
    const timeField = document.getElementById('reminder-time-field');
    const intervalField = document.getElementById('reminder-interval-field');
    if (!timeField || !intervalField) return;
    intervalField.style.display = repeat === 'interval' ? 'block' : 'none';
    timeField.style.display = repeat === 'interval' ? 'none' : 'block';
  }

  // Which reminder the form is currently editing, or null when adding.
  let editingReminderId = null;

  // Clears the reminder sheet back to a blank slate. Without this the form
  // kept whatever was typed or picked last time, so reopening it showed a
  // half-filled reminder the user had already abandoned.
  function resetReminderForm() {
    const form = document.getElementById('reminder-form');
    if (!form) return;
    editingReminderId = null;
    form.reset();
    const submit = document.getElementById('reminder-submit');
    if (submit) submit.textContent = 'Save Reminder';
    const cancel = document.getElementById('reminder-cancel-edit');
    if (cancel) cancel.style.display = 'none';
    toggleReminderFields();
  }

  // Loads an existing reminder into the same form, so editing and adding
  // share one set of fields rather than a second near-identical sheet.
  function startEditReminder(id) {
    const r = Scheduler.list().find(x => x.id === id);
    if (!r) return;
    editingReminderId = id;

    document.getElementById('reminder-title').value = r.title || '';
    document.getElementById('reminder-category').value = r.category || 'custom';
    document.getElementById('reminder-repeat').value = r.repeat || 'once';
    if (r.repeat === 'interval') {
      document.getElementById('reminder-every').value = r.every || 60;
    } else if (r.time) {
      const d = new Date(r.time);
      document.getElementById('reminder-time').value =
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    toggleReminderFields();

    document.getElementById('reminder-submit').textContent = 'Update Reminder';
    const cancel = document.getElementById('reminder-cancel-edit');
    if (cancel) cancel.style.display = 'block';
    document.getElementById('reminder-title').focus();
  }

  async function handleAddReminder(e) {
    e.preventDefault();
    const title = document.getElementById('reminder-title').value.trim();
    const category = document.getElementById('reminder-category').value;
    const repeat = document.getElementById('reminder-repeat').value;
    const every = Number(document.getElementById('reminder-every').value) || 60;
    const timeVal = document.getElementById('reminder-time').value;
    if (!title) { UI.toast('Give the reminder a title.', 'error'); return; }

    let time = Utils.nowISO();
    if (repeat !== 'interval' && timeVal) {
      const [h, m] = timeVal.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      // A one-off means "today, or tomorrow if that time has already gone".
      if (repeat === 'once' && d < new Date()) d.setDate(d.getDate() + 1);
      time = d.toISOString();
    }

    const perm = await NotificationService.requestPermission();
    if (perm === 'denied') UI.toast('Notifications are blocked — reminders will still show as in-app alerts.', '');

    if (editingReminderId) {
      Scheduler.update(editingReminderId, { title, category, icon: iconForCategory(category), repeat, time, every });
      UI.toast('Reminder updated.', 'success');
    } else {
      Scheduler.add({ title, category, icon: iconForCategory(category), repeat, time, every });
      UI.toast('Reminder saved.', 'success');
    }
    resetReminderForm();
    renderReminders();
  }

  function iconForCategory(cat) {
    const map = { feeding: 'bottle', medicine: 'medicine', sleep: 'sleep', water: 'droplet', health: 'syringe', school: 'checklist', care: 'droplet', custom: 'bell' };
    return map[cat] || 'bell';
  }

  // Blank the form every time the sheet is opened, and wire "Cancel edit".
  function bindReminderSheetReset() {
    document.getElementById('sheet-reminders')
      ?.addEventListener('sheet:open', resetReminderForm);
    document.getElementById('reminder-cancel-edit')
      ?.addEventListener('click', resetReminderForm);
  }

  function bindReminderListEvents() {
    const list = document.getElementById('reminders-list');
    if (!list) return;
    list.addEventListener('click', (e) => {
      const edit = e.target.closest('[data-edit-reminder]');
      if (edit) { startEditReminder(edit.dataset.editReminder); return; }
      const del = e.target.closest('[data-delete-reminder]');
      if (del) {
        // If the deleted one was being edited, drop back to "add" mode.
        if (editingReminderId === del.dataset.deleteReminder) resetReminderForm();
        Scheduler.remove(del.dataset.deleteReminder);
        renderReminders();
        UI.toast('Reminder deleted.');
      }
    });
    list.addEventListener('change', (e) => {
      const toggle = e.target.closest('[data-reminder-toggle]');
      if (toggle) Scheduler.toggle(toggle.dataset.reminderToggle, toggle.checked);
    });
  }

  /* ---------------- Budget / expenses ---------------- */
  function addExpense({ label, amount, category }) {
    const budget = Storage.get('budget') || { entries: [] };
    budget.entries.push({ id: Utils.uid(), label, amount: Number(amount), category, date: Utils.nowISO() });
    Storage.set('budget', budget);
  }

  function renderBudget(containerId, totalId) {
    const el = document.getElementById(containerId);
    const totalEl = document.getElementById(totalId);
    const budget = Storage.get('budget') || { entries: [] };
    const total = budget.entries.reduce((s, e) => s + e.amount, 0);
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    if (!el) return;
    el.innerHTML = budget.entries.length ? budget.entries.slice().reverse().map(e => `
      <div class="log-item">
        <div class="log-icon">${Icons.wallet}</div>
        <div class="log-info"><div class="log-title">${Utils.escapeHtml(e.label)}</div><div class="log-meta">${Utils.escapeHtml(e.category)} · ${Utils.formatDate(e.date)}</div></div>
        <div class="log-value">$${e.amount.toFixed(2)}</div>
      </div>`).join('') : Components.emptyState({ icon: 'wallet', title: 'No expenses logged', subtitle: 'Track baby spending by category.' });
  }

  /* ---------------- Emergency contacts ---------------- */
  function saveEmergencyContacts(contacts) {
    const settings = Storage.get('settings') || {};
    settings.emergencyContacts = contacts;
    Storage.set('settings', settings);
  }

  return {
    toggleFavorite, isFavorite, renderGrid, renderCategoryChips, initSearch,
    renderReminders, renderReminderPresets, toggleReminderFields, handleAddReminder,
    bindReminderListEvents, bindReminderSheetReset, resetReminderForm, startEditReminder,
    addExpense, renderBudget,
    saveEmergencyContacts,
  };
})();
