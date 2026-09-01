/* ==========================================================================
   MOMSLY — LOG EDITOR
   Lets any logged entry be corrected after the fact — the value itself and
   the date/time it happened.

   Every tracker type's fields are declared once here, as data, rather than
   as another copy of the markup in tracker.js. The sheet builds itself
   from that declaration, so a new tracker type only has to be described in
   one place to become editable everywhere it's listed.
   ========================================================================== */

const LogEditor = (() => {

  // `scale` converts between what's stored and what's shown: sleep is kept
  // in milliseconds but entered in hours.
  const FIELDS = {
    feeding:       [{ key: 'amount', label: 'Amount (oz)', type: 'number', step: '0.5' }],
    breastfeeding: [{ key: 'duration', label: 'Duration (min)', type: 'number' },
                    { key: 'side', label: 'Side', type: 'select', options: ['left', 'right', 'both'] }],
    pump:          [{ key: 'amount', label: 'Output (oz)', type: 'number', step: '0.5' }],
    sleep:         [{ key: 'duration', label: 'Duration (hours)', type: 'number', step: '0.25', scale: 3600000 }],
    diaper:        [{ key: 'diaperType', label: 'Type', type: 'select', options: ['Wet', 'Dirty', 'Mixed', 'Dry'] }],
    medicine:      [{ key: 'medName', label: 'Medicine name', type: 'text' },
                    { key: 'dose', label: 'Dose', type: 'text' }],
    weight:        [{ key: 'value', label: 'Weight (lb)', type: 'number', step: '0.1' }],
    height:        [{ key: 'value', label: 'Height (in)', type: 'number', step: '0.1' }],
    vaccine:       [{ key: 'vaccineName', label: 'Vaccine name', type: 'text' }],
    temperature:   [{ key: 'value', label: 'Temperature (°F)', type: 'number', step: '0.1' }],
    mood:          [{ key: 'mood', label: 'Mood', type: 'select', options: ['Happy', 'Fussy', 'Calm', 'Sleepy', 'Sick'] }],
    teething:      [{ key: 'note', label: 'Note', type: 'text' }],
    water:         [{ key: 'amount', label: 'Amount (oz)', type: 'number', step: '0.5' }],
    solids:        [{ key: 'note', label: 'Food', type: 'text' }],
  };

  let currentId = null;
  let onSaved = null;

  /* ---- local date/time helpers (never UTC — a 1am feed must not slide
         onto the previous day in the picker) ---- */
  const toDateInput = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const toTimeInput = (d) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  function ensureSheet() {
    let overlay = document.getElementById('sheet-edit-log');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'sheet-edit-log';
    overlay.innerHTML = `
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h2 id="edit-log-title">Edit entry</h2>
          <button class="icon-btn" data-close-sheet aria-label="Close">${Icons.close}</button>
        </div>
        <form id="edit-log-form">
          <div id="edit-log-fields"></div>
          <div class="field"><label for="edit-log-date">Date</label><input type="date" id="edit-log-date" required></div>
          <div class="field"><label for="edit-log-time">Time</label><input type="time" id="edit-log-time" required></div>
          <button class="btn btn--primary" type="submit">Save Changes</button>
          <button class="btn btn--ghost" type="button" id="edit-log-delete" style="margin-top:8px;color:var(--color-danger);">Delete Entry</button>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#edit-log-form').addEventListener('submit', save);
    overlay.querySelector('#edit-log-delete').addEventListener('click', remove);
    return overlay;
  }

  function fieldHTML(spec, log) {
    let raw = log[spec.key];
    if (spec.scale && typeof raw === 'number') raw = raw / spec.scale;
    const value = raw ?? '';

    if (spec.type === 'select') {
      const opts = spec.options.map(o =>
        `<option value="${Utils.escapeHtml(o)}" ${String(o).toLowerCase() === String(value).toLowerCase() ? 'selected' : ''}>${Utils.escapeHtml(o)}</option>`
      ).join('');
      return `<div class="field"><label for="edit-f-${spec.key}">${spec.label}</label>
        <select id="edit-f-${spec.key}" data-key="${spec.key}">${opts}</select></div>`;
    }
    return `<div class="field"><label for="edit-f-${spec.key}">${spec.label}</label>
      <input type="${spec.type}" id="edit-f-${spec.key}" data-key="${spec.key}"
        ${spec.step ? `step="${spec.step}"` : ''} value="${Utils.escapeHtml(String(value))}"></div>`;
  }

  function open(logId, afterSave) {
    const log = (Storage.get('logs') || []).find(l => l.id === logId);
    if (!log) { UI.toast("That entry no longer exists.", 'error'); return; }

    currentId = logId;
    onSaved = afterSave;
    ensureSheet();

    const typeDef = Data.trackerType(log.type) || { label: log.type };
    const specs = FIELDS[log.type] || [];
    document.getElementById('edit-log-title').textContent = `Edit ${typeDef.label || log.type}`;

    // Types whose main field IS the note (teething, solids) must not also
    // get a second generic note box.
    const usesNoteAsMainField = specs.some(s => s.key === 'note');
    const noteField = usesNoteAsMainField ? '' : `
      <div class="field"><label for="edit-f-note">Note (optional)</label>
        <input type="text" id="edit-f-note" data-key="note" value="${Utils.escapeHtml(log.note || '')}"></div>`;

    document.getElementById('edit-log-fields').innerHTML =
      specs.map(s => fieldHTML(s, log)).join('') + noteField;

    const when = new Date(log.timestamp);
    document.getElementById('edit-log-date').value = toDateInput(when);
    document.getElementById('edit-log-time').value = toTimeInput(when);

    UI.openSheet('sheet-edit-log');
  }

  function save(e) {
    e.preventDefault();
    const log = (Storage.get('logs') || []).find(l => l.id === currentId);
    if (!log) return;

    const specs = FIELDS[log.type] || [];
    const patch = {};

    document.querySelectorAll('#edit-log-fields [data-key]').forEach(input => {
      const key = input.dataset.key;
      const spec = specs.find(s => s.key === key);
      let v = input.value;
      if (spec?.type === 'number') {
        v = v === '' ? 0 : Number(v);
        if (Number.isNaN(v)) v = 0;
        if (spec.scale) v = v * spec.scale;
      }
      patch[key] = v;
    });

    const dateVal = document.getElementById('edit-log-date').value;
    const timeVal = document.getElementById('edit-log-time').value;
    if (dateVal && timeVal) {
      const [y, mo, d] = dateVal.split('-').map(Number);
      const [h, mi] = timeVal.split(':').map(Number);
      patch.timestamp = new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
    }

    Storage.updateItem('logs', currentId, patch);
    UI.closeSheet('sheet-edit-log');
    UI.toast('Entry updated.', 'success');
    if (typeof onSaved === 'function') onSaved();
  }

  async function remove() {
    const ok = await UI.confirmDialog({
      title: 'Delete entry?', message: 'This log entry will be permanently removed.',
      confirmLabel: 'Delete', danger: true,
    });
    if (!ok) return;
    Storage.removeItem('logs', currentId);
    UI.closeSheet('sheet-edit-log');
    if (typeof onSaved === 'function') onSaved();
  }

  return { open, FIELDS };
})();
