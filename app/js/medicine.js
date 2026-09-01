/* ==========================================================================
   MOMSLY — MEDICINE & HEALTH
   Drives medicine-health.html: every medicine/health tool gathered onto
   one page — active medications, the age-based vaccination schedule, and
   the latest health readings.

   Nothing here invents a second source of truth: doses are written as
   normal `medicine` tracker logs, vaccination progress is read from
   `vaccine` logs, and temperature/weight come straight from the tracker.
   Only the medication list itself (name, dose, how often) is new, since
   the app had nowhere to record a standing prescription before.
   ========================================================================== */

const MedicineHealth = (() => {

  // Routine childhood immunisations, by age. Mirrors the standard US
  // (CDC) infant schedule — informational only, since real schedules
  // vary by country and by what a pediatrician advises.
  const VACCINE_SCHEDULE = [
    { ageMonths: 0,  label: 'Birth',      vaccines: ['HepB (1st dose)'] },
    { ageMonths: 2,  label: '2 Months',   vaccines: ['Rotavirus', 'DTaP', 'Hib', 'Pneumococcal', 'Polio'] },
    { ageMonths: 4,  label: '4 Months',   vaccines: ['Rotavirus', 'DTaP', 'Hib', 'Pneumococcal', 'Polio'] },
    { ageMonths: 6,  label: '6 Months',   vaccines: ['DTaP', 'Pneumococcal', 'Polio', 'Flu'] },
    { ageMonths: 12, label: '12 Months',  vaccines: ['MMR', 'Varicella', 'HepA'] },
    { ageMonths: 15, label: '15 Months',  vaccines: ['DTaP', 'Hib', 'Pneumococcal'] },
    { ageMonths: 18, label: '18 Months',  vaccines: ['HepA (2nd dose)'] },
  ];

  const COMPACT_COUNT = 4;   // milestones shown before "View Full Schedule"
  let showFullSchedule = false;

  /* ---------------- shared helpers ---------------- */

  function activeChild() {
    const children = Storage.get('children') || [];
    const activeId = Storage.get('activeChildId');
    return children.find(c => c.id === activeId) || children[0] || null;
  }

  function logsOf(type, childId) {
    return (Storage.get('logs') || [])
      .filter(l => l.type === type && (!childId || l.childId === childId))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  /* ---------------- medications ---------------- */

  function medications() {
    const child = activeChild();
    return (Storage.get('medications') || []).filter(m => !child || !m.childId || m.childId === child.id);
  }

  function lastDose(med) {
    const child = activeChild();
    return logsOf('medicine', child?.id).find(l => (l.medName || '').toLowerCase() === med.name.toLowerCase()) || null;
  }

  // For a scheduled medication: when it's next due. Once today's dose is
  // logged (or its time has already passed), the next one rolls to tomorrow.
  function nextDose(med) {
    if (med.schedule !== 'daily' || !med.time) return null;
    const [h, m] = med.time.split(':').map(Number);
    const due = new Date();
    due.setHours(h, m, 0, 0);
    const last = lastDose(med);
    const takenToday = last && Utils.isToday(last.timestamp);
    if (takenToday || due < new Date()) due.setDate(due.getDate() + 1);
    return due;
  }

  function addMedication({ name, dose, schedule, time }) {
    const child = activeChild();
    const med = {
      id: Utils.uid(),
      childId: child?.id || null,
      name, dose: dose || '',
      schedule,                          // 'daily' | 'asneeded'
      time: schedule === 'daily' ? time : null,
      reminderId: null,
      createdAt: Utils.nowISO(),
    };

    // A daily medication also becomes a real reminder, so it reaches the
    // existing notification + background-push pipeline for free.
    if (schedule === 'daily' && time && typeof Scheduler !== 'undefined') {
      const [h, m] = time.split(':').map(Number);
      const when = new Date();
      when.setHours(h, m, 0, 0);
      const reminder = Scheduler.add({
        title: name, category: 'medicine', icon: 'medicine',
        repeat: 'daily', time: when.toISOString(),
      });
      med.reminderId = reminder.id;
    }

    Storage.pushItem('medications', med);
    return med;
  }

  function removeMedication(id) {
    const med = medications().find(m => m.id === id);
    if (med?.reminderId && typeof Scheduler !== 'undefined') Scheduler.remove(med.reminderId);
    Storage.removeItem('medications', id);
  }

  function logDose(id) {
    const med = medications().find(m => m.id === id);
    if (!med) return;
    const child = activeChild();
    Storage.pushItem('logs', {
      id: Utils.uid(), childId: child?.id || null, type: 'medicine',
      medName: med.name, dose: med.dose, note: '', timestamp: Utils.nowISO(),
    });
    if (med.reminderId && typeof Scheduler !== 'undefined') Scheduler.markDone(med.reminderId);
    UI.toast(`${med.name} logged.`, 'success');
    render();
  }

  function scheduleLabel(med) {
    if (med.schedule === 'daily') return 'Daily';
    return 'As needed';
  }

  function renderMedications() {
    const el = document.getElementById('medications-grid');
    if (!el) return;
    const meds = medications();

    if (!meds.length) {
      el.innerHTML = `<div class="mh-span-2">${Components.emptyState({
        icon: 'medicine', title: 'No medications yet',
        subtitle: 'Add one to keep doses and timings in one place.',
      })}</div>`;
      return;
    }

    el.innerHTML = meds.map(med => {
      const next = nextDose(med);
      const last = lastDose(med);
      const isDaily = med.schedule === 'daily';
      return `
        <article class="mh-card mh-med">
          <div class="mh-med__top">
            <span class="mh-med__icon">${isDaily ? Icons.medicine : Icons.syringe}</span>
            <span class="mh-badge ${isDaily ? 'mh-badge--accent' : 'mh-badge--muted'}">${scheduleLabel(med)}</span>
          </div>
          <h3 class="mh-med__name">${Utils.escapeHtml(med.name)}</h3>
          <p class="mh-med__dose">${Utils.escapeHtml(med.dose || 'No dose noted')}</p>
          <div class="mh-med__foot">
            <div class="mh-med__timing">
              <span class="mh-med__timing-label">${isDaily ? 'Next dose' : 'Last dose'}</span>
              <span class="mh-med__timing-value ${isDaily ? 'is-next' : ''}">${
                isDaily
                  ? (next ? (Utils.isToday(next) ? 'Today, ' : 'Tomorrow, ') + Utils.formatTime(next) : '—')
                  : (last ? Utils.formatDateTime(last.timestamp) : 'Not logged yet')
              }</span>
            </div>
            <div class="mh-med__actions">
              <button class="mh-pill-btn" data-log-dose="${med.id}">${isDaily ? 'Mark Taken' : 'Log Dose'}</button>
              <button class="icon-btn mh-med__delete" data-delete-med="${med.id}" aria-label="Remove medication">${Icons.trash}</button>
            </div>
          </div>
        </article>`;
    }).join('');

    el.querySelectorAll('[data-log-dose]').forEach(b =>
      b.addEventListener('click', () => logDose(b.dataset.logDose)));

    el.querySelectorAll('[data-delete-med]').forEach(b =>
      b.addEventListener('click', async () => {
        const med = medications().find(m => m.id === b.dataset.deleteMed);
        const ok = await UI.confirmDialog({
          title: 'Remove medication?',
          message: `"${med?.name || 'This medication'}" will be removed. Doses already logged are kept.`,
          confirmLabel: 'Remove', danger: true,
        });
        if (ok) { removeMedication(b.dataset.deleteMed); render(); }
      }));
  }

  /* ---------------- vaccination schedule ---------------- */

  // Each milestone is due at (date of birth + its age in months). It counts
  // as done when a `vaccine` entry was logged in its window — from two
  // weeks before it is due, up until the next milestone falls due.
  function milestones() {
    const child = activeChild();
    if (!child?.dob) return [];
    const vaccineLogs = logsOf('vaccine', child.id);
    const now = new Date();

    const rows = VACCINE_SCHEDULE.map((m, i) => {
      const due = addMonths(child.dob, m.ageMonths);
      const nextDue = VACCINE_SCHEDULE[i + 1] ? addMonths(child.dob, VACCINE_SCHEDULE[i + 1].ageMonths) : null;
      const windowStart = new Date(due.getTime() - 14 * 86400000);
      const done = vaccineLogs.find(l => {
        const t = new Date(l.timestamp);
        return t >= windowStart && (!nextDue || t < nextDue);
      }) || null;
      return { ...m, due, done, status: done ? 'completed' : (due < now ? 'overdue' : 'future') };
    });

    // The soonest not-yet-done milestone is the one to highlight.
    const nextUp = rows.find(r => r.status === 'future');
    if (nextUp) nextUp.status = 'upcoming';
    return rows;
  }

  function renderVaccines() {
    const el = document.getElementById('vaccine-timeline');
    if (!el) return;
    const child = activeChild();

    if (!child?.dob) {
      el.innerHTML = Components.emptyState({
        icon: 'syringe', title: 'Add a birth date first',
        subtitle: "The schedule is built from your baby's date of birth.",
      });
      return;
    }

    const all = milestones();
    const rows = showFullSchedule ? all : all.slice(0, COMPACT_COUNT);
    const statusText = {
      completed: r => `Completed on ${Utils.formatDate(r.done.timestamp)}`,
      overdue: r => `Was due ${Utils.formatDate(r.due)}`,
      upcoming: r => `Due ${Utils.formatDate(r.due)}`,
      future: r => `Due ${Utils.formatDate(r.due)}`,
    };

    el.innerHTML = `
      <div class="mh-timeline">
        ${rows.map(r => `
          <div class="mh-tl-row mh-tl-row--${r.status}">
            <span class="mh-tl-dot">${r.status === 'completed' ? Icons.check : ''}</span>
            <h4 class="mh-tl-title">${Utils.escapeHtml(r.label)}${r.status === 'upcoming' ? ' (Upcoming)' : ''}</h4>
            <p class="mh-tl-vaccines">${r.vaccines.map(Utils.escapeHtml).join(', ')}</p>
            <span class="mh-tl-status">${statusText[r.status](r)}</span>
          </div>`).join('')}
      </div>
      ${all.length > COMPACT_COUNT ? `
        <button class="mh-outline-btn" id="toggle-schedule">
          ${showFullSchedule ? 'Show Less' : 'View Full Schedule'}
        </button>` : ''}
      <a class="mh-outline-btn" href="tracker.html?tab=vaccine" style="margin-top:10px;">${Icons.plus} Log a Vaccination</a>`;

    document.getElementById('toggle-schedule')?.addEventListener('click', () => {
      showFullSchedule = !showFullSchedule;
      renderVaccines();
    });
  }

  /* ---------------- recent health logs ---------------- */

  function renderHealthLogs() {
    const el = document.getElementById('health-logs');
    if (!el) return;
    const child = activeChild();
    const temp = logsOf('temperature', child?.id)[0] || null;
    const weights = logsOf('weight', child?.id);
    const weight = weights[0] || null;
    const prevWeight = weights[1] || null;

    // 97–99°F is the ordinary range; anything outside is flagged so it
    // stands out, without offering a diagnosis either way.
    let tempNote = 'Not logged yet';
    let tempClass = 'is-muted';
    if (temp) {
      const normal = temp.value >= 97 && temp.value <= 99;
      tempNote = `${normal ? 'Normal' : 'Outside 97–99°F'} · ${Utils.relativeTime(temp.timestamp)}`;
      tempClass = normal ? 'is-ok' : 'is-warn';
    }

    let weightNote = 'Not logged yet';
    if (weight) {
      const delta = prevWeight ? weight.value - prevWeight.value : null;
      const deltaLabel = delta === null ? '' :
        `${delta > 0 ? '+' : ''}${delta.toFixed(1)} lb since last · `;
      weightNote = `${deltaLabel}${Utils.relativeTime(weight.timestamp)}`;
    }

    el.innerHTML = `
      <div class="mh-card mh-metric">
        <span class="mh-metric__icon mh-metric__icon--temp">${Icons.thermometer}</span>
        <div>
          <h4>Temperature</h4>
          <p class="mh-metric__value">${temp ? Utils.escapeHtml(String(temp.value)) + '°F' : '—'}</p>
          <p class="mh-metric__meta ${tempClass}">${Utils.escapeHtml(tempNote)}</p>
        </div>
      </div>
      <div class="mh-card mh-metric">
        <span class="mh-metric__icon mh-metric__icon--weight">${Icons.weight}</span>
        <div>
          <h4>Weight</h4>
          <p class="mh-metric__value">${weight ? Utils.escapeHtml(String(weight.value)) + ' lb' : '—'}</p>
          <p class="mh-metric__meta">${Utils.escapeHtml(weightNote)}</p>
        </div>
      </div>
      <a class="mh-card mh-metric mh-metric--add" href="tracker.html?tab=temperature">
        <span class="mh-metric__icon mh-metric__icon--add">${Icons.plus}</span>
        <span>Log New Metric</span>
      </a>`;
  }

  /* ---------------- add-medication sheet ---------------- */

  function bindAddSheet() {
    const form = document.getElementById('medication-form');
    const scheduleSel = document.getElementById('med-schedule');
    const timeField = document.getElementById('med-time-field');
    if (!form) return;

    document.getElementById('add-medication-btn')?.addEventListener('click', () => {
      form.reset();
      if (timeField) timeField.style.display = 'block';
      UI.openSheet('sheet-add-medication');
    });

    scheduleSel?.addEventListener('change', () => {
      if (timeField) timeField.style.display = scheduleSel.value === 'daily' ? 'block' : 'none';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('med-name').value.trim();
      const dose = document.getElementById('med-dose').value.trim();
      const schedule = scheduleSel.value;
      const time = document.getElementById('med-time').value;
      if (!name) return;
      if (schedule === 'daily' && !time) { UI.toast('Pick a time for the daily dose.', 'error'); return; }

      addMedication({ name, dose, schedule, time });
      form.reset();
      UI.closeSheet('sheet-add-medication');
      UI.toast(`${name} added.`, 'success');
      render();
    });
  }

  function render() {
    renderMedications();
    renderVaccines();
    renderHealthLogs();
  }

  function init() {
    showFullSchedule = false;
    bindAddSheet();
    render();
  }

  return { init, render, VACCINE_SCHEDULE };
})();
