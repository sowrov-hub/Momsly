/* ==========================================================================
   MOMSLY — SCHEDULER
   Owns the reminders list and the "is anything due right now" loop.
   Two reminder shapes:
     - repeat: 'once'     → fires at a specific ISO time
     - repeat: 'daily'    → fires at the same HH:MM every day
     - repeat: 'interval' → fires every N minutes from lastFiredAt
   ========================================================================== */

const Scheduler = (() => {
  let checkHandle = null;

  function list() {
    return Storage.get('reminders') || [];
  }

  function add(reminder) {
    const item = {
      id: Utils.uid(),
      title: reminder.title,
      category: reminder.category || 'custom',
      icon: reminder.icon || 'bell',
      repeat: reminder.repeat || 'once',
      time: reminder.time || Utils.nowISO(),
      every: reminder.every || null,
      enabled: true,
      lastFiredAt: null,
      snoozedUntil: null,
      createdAt: Utils.nowISO(),
    };
    Storage.pushItem('reminders', item);
    return item;
  }

  function remove(id) {
    Storage.removeItem('reminders', id);
  }

  function toggle(id, enabled) {
    Storage.updateItem('reminders', id, { enabled });
  }

  function snooze(id, minutes = 10) {
    const until = new Date(Date.now() + minutes * 60000).toISOString();
    Storage.updateItem('reminders', id, { snoozedUntil: until });
  }

  function markDone(id) {
    Storage.updateItem('reminders', id, { lastFiredAt: Utils.nowISO(), snoozedUntil: null });
  }

  function isDue(r, now) {
    if (!r.enabled) return false;
    if (r.snoozedUntil && new Date(r.snoozedUntil) > now) return false;

    if (r.repeat === 'once') {
      if (r.lastFiredAt) return false;
      return new Date(r.time) <= now;
    }
    if (r.repeat === 'daily') {
      const t = new Date(r.time);
      const todayTarget = new Date(now);
      todayTarget.setHours(t.getHours(), t.getMinutes(), 0, 0);
      const alreadyFiredToday = r.lastFiredAt && Utils.todayKey(new Date(r.lastFiredAt)) === Utils.todayKey(now);
      return !alreadyFiredToday && now >= todayTarget;
    }
    if (r.repeat === 'interval') {
      const base = r.lastFiredAt ? new Date(r.lastFiredAt) : new Date(r.createdAt);
      const next = new Date(base.getTime() + (r.every || 60) * 60000);
      return now >= next;
    }
    return false;
  }

  function checkDue() {
    const now = new Date();
    const reminders = list();
    let firedAny = false;
    reminders.forEach(r => {
      if (isDue(r, now)) {
        NotificationService.fire({ title: r.title, body: reminderBody(r), tag: r.id });
        Storage.updateItem('reminders', r.id, { lastFiredAt: now.toISOString(), snoozedUntil: null });
        firedAny = true;
      }
    });
    return firedAny;
  }

  function reminderBody(r) {
    const bodies = {
      feeding: "It's about time for the next feed.",
      medicine: "Time for medicine.",
      sleep: "Time for nap or bedtime wind-down.",
      water: "Quick water break.",
      health: "Upcoming health reminder.",
      school: "School reminder.",
      care: "Care routine reminder.",
      custom: "You asked to be reminded.",
    };
    return bodies[r.category] || 'Reminder from Momsly.';
  }

  function start() {
    checkDue();
    if (checkHandle) clearInterval(checkHandle);
    checkHandle = setInterval(checkDue, 30000);
  }

  return { list, add, remove, toggle, snooze, markDone, checkDue, start };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) Scheduler.start();
});
