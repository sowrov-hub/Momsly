/* ==========================================================================
   MOMSLY — DOCTOR APPOINTMENTS
   Deliberately NOT reminders. An appointment is a fact about a day — a
   check-up at 9:30 on the 14th — not something the app should nag about,
   so nothing here touches Scheduler and no notification is ever created.

   Reminders are the opposite: recurring nudges with no calendar date.
   Keeping the two apart is why the reminder form no longer asks for a
   date, and why this one always does.
   ========================================================================== */

const Appointments = (() => {

  let editingId = null;

  function activeChildId() {
    const children = Storage.get('children') || [];
    return Storage.get('activeChildId') || children[0]?.id || null;
  }

  function list() {
    const childId = activeChildId();
    return (Storage.get('appointments') || [])
      .filter(a => !childId || !a.childId || a.childId === childId)
      .sort((a, b) => new Date(a.when) - new Date(b.when));
  }

  // Only what's still ahead — used by the home dashboard.
  function upcoming(limit = 5) {
    const now = Date.now();
    return list().filter(a => new Date(a.when).getTime() >= now).slice(0, limit);
  }

  function add({ title, doctor, when, note }) {
    const item = {
      id: Utils.uid(), childId: activeChildId(),
      title, doctor: doctor || '', when, note: note || '',
      createdAt: Utils.nowISO(),
    };
    Storage.pushItem('appointments', item);
    return item;
  }

  function update(id, patch) { return Storage.updateItem('appointments', id, patch); }
  function remove(id) { Storage.removeItem('appointments', id); }

  /* ---------------- form ---------------- */

  const toDateInput = (d) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const toTimeInput = (d) =>
    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

  function resetForm() {
    editingId = null;
    const form = document.getElementById('appointment-form');
    if (!form) return;
    form.reset();
    const submit = document.getElementById('appointment-submit');
    if (submit) submit.textContent = 'Save Appointment';
    document.getElementById('appointment-cancel-edit')?.setAttribute('style', 'display:none;');
  }

  function startEdit(id) {
    const appt = list().find(a => a.id === id);
    if (!appt) return;
    editingId = id;
    const when = new Date(appt.when);
    document.getElementById('appointment-title').value = appt.title;
    document.getElementById('appointment-doctor').value = appt.doctor || '';
    document.getElementById('appointment-date').value = toDateInput(when);
    document.getElementById('appointment-time').value = toTimeInput(when);
    document.getElementById('appointment-note').value = appt.note || '';
    document.getElementById('appointment-submit').textContent = 'Update Appointment';
    document.getElementById('appointment-cancel-edit')?.setAttribute('style', 'display:block;');
    document.getElementById('appointment-title').focus();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('appointment-title').value.trim();
    const doctor = document.getElementById('appointment-doctor').value.trim();
    const dateVal = document.getElementById('appointment-date').value;
    const timeVal = document.getElementById('appointment-time').value;
    const note = document.getElementById('appointment-note').value.trim();

    if (!title) { UI.toast('Give the appointment a name.', 'error'); return; }
    if (!dateVal) { UI.toast('Pick the date of the appointment.', 'error'); return; }

    const [y, mo, d] = dateVal.split('-').map(Number);
    const [h, mi] = (timeVal || '09:00').split(':').map(Number);
    const when = new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();

    if (editingId) {
      update(editingId, { title, doctor, when, note });
      UI.toast('Appointment updated.', 'success');
    } else {
      add({ title, doctor, when, note });
      UI.toast('Appointment saved.', 'success');
    }
    resetForm();
    render();
  }

  /* ---------------- list ---------------- */

  function render() {
    const el = document.getElementById('appointments-list');
    if (!el) return;
    const items = list();
    const now = Date.now();

    if (!items.length) {
      el.innerHTML = Components.emptyState({
        icon: 'calendar', title: 'No appointments yet',
        subtitle: 'Add a check-up, clinic visit or specialist appointment.',
      });
      return;
    }

    el.innerHTML = items.map(a => {
      const when = new Date(a.when);
      const past = when.getTime() < now;
      const meta = [Utils.formatDateTime(when), a.doctor, a.note].filter(Boolean).join(' · ');
      return `
        <div class="log-item${past ? ' appt--past' : ''}">
          <div class="log-icon">${Icons.calendar}</div>
          <div class="log-info">
            <div class="log-title">${Utils.escapeHtml(a.title)}${past ? ' <span class="appt-tag">Past</span>' : ''}</div>
            <div class="log-meta">${Utils.escapeHtml(meta)}</div>
          </div>
          <button class="icon-btn" data-edit-appt="${a.id}" aria-label="Edit appointment">${Icons.edit}</button>
          <button class="icon-btn" data-delete-appt="${a.id}" aria-label="Delete appointment">${Icons.trash}</button>
        </div>`;
    }).join('');

    el.querySelectorAll('[data-edit-appt]').forEach(b =>
      b.addEventListener('click', () => startEdit(b.dataset.editAppt)));

    el.querySelectorAll('[data-delete-appt]').forEach(b =>
      b.addEventListener('click', async () => {
        const appt = list().find(a => a.id === b.dataset.deleteAppt);
        const ok = await UI.confirmDialog({
          title: 'Delete appointment?',
          message: `"${appt?.title || 'This appointment'}" will be removed.`,
          confirmLabel: 'Delete', danger: true,
        });
        if (ok) { remove(b.dataset.deleteAppt); resetForm(); render(); }
      }));
  }

  function init() {
    document.getElementById('appointment-form')?.addEventListener('submit', handleSubmit);
    document.getElementById('appointment-cancel-edit')?.addEventListener('click', () => { resetForm(); render(); });
    // Opening the sheet always starts from a clean form.
    document.getElementById('sheet-doctor-appointment')
      ?.addEventListener('sheet:open', () => { resetForm(); render(); });
    render();
  }

  return { init, render, list, upcoming, add, update, remove };
})();
