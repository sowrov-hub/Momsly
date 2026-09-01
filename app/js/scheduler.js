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
    syncToServerBestEffort(item);
    return item;
  }

  function remove(id) {
    Storage.removeItem('reminders', id);
    if (typeof Push !== 'undefined') {
      Push.removeReminderFromServer(id).catch(() => {});
    }
  }

  function toggle(id, enabled) {
    const updated = Storage.updateItem('reminders', id, { enabled });
    if (updated) syncToServerBestEffort(updated);
  }

  // Editing an existing reminder. Clears lastFiredAt/snoozedUntil so a
  // rescheduled reminder is judged against its new time rather than being
  // suppressed by when the old one last went off.
  function update(id, patch) {
    const updated = Storage.updateItem('reminders', id, { ...patch, lastFiredAt: null, snoozedUntil: null });
    if (updated) syncToServerBestEffort(updated);
    return updated;
  }

  // Best-effort mirror to Supabase so a GitHub Actions-triggered Edge
  // Function can deliver this reminder via true background push even
  // when Momsly is fully closed. The local reminder above is already
  // saved and fully functional regardless of whether this succeeds —
  // Push.js and SupabaseClient.js both fail silently when unconfigured,
  // offline, or unavailable, so this can never break reminder creation.
  function syncToServerBestEffort(item) {
    if (typeof Push === 'undefined' || !Push.isConfigured()) return;
    Push.subscribeToPush().catch(() => {});
    Push.syncReminderToServer(item).catch(() => {});
  }

  function snooze(id, minutes = 10) {
    const until = new Date(Date.now() + minutes * 60000).toISOString();
    Storage.updateItem('reminders', id, { snoozedUntil: until });
  }

  function markDone(id) {
    Storage.updateItem('reminders', id, { lastFiredAt: Utils.nowISO(), snoozedUntil: null });
  }

  // When this reminder will next fire — used to sort the dashboard's
  // "Upcoming Reminders" list soonest-first. Mirrors isDue()'s logic:
  // a reminder that's currently overdue (not yet handled) returns a
  // time in the past, which naturally sorts it to the very top.
  function nextFireTime(r, now = new Date()) {
    if (r.repeat === 'daily') {
      const t = new Date(r.time);
      const todayTarget = new Date(now);
      todayTarget.setHours(t.getHours(), t.getMinutes(), 0, 0);
      const alreadyFiredToday = r.lastFiredAt && Utils.todayKey(new Date(r.lastFiredAt)) === Utils.todayKey(now);
      if (alreadyFiredToday) {
        const tomorrow = new Date(todayTarget);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      }
      return todayTarget;
    }
    if (r.repeat === 'interval') {
      const base = r.lastFiredAt ? new Date(r.lastFiredAt) : new Date(r.createdAt);
      return new Date(base.getTime() + (r.every || 60) * 60000);
    }
    return new Date(r.time || now); // 'once'
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
    checkHandle = setInterval(checkDue, 20000);

    // Mobile/desktop browsers throttle or fully pause setInterval timers
    // while a tab is backgrounded, which could otherwise let a due feeding
    // or medicine reminder pass silently. Catching up the instant the app
    // regains focus/visibility closes that gap.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkDue();
    });
    window.addEventListener('focus', checkDue);
    window.addEventListener('pageshow', checkDue);
  }

  return { list, add, update, remove, toggle, snooze, markDone, checkDue, start, nextFireTime };
})();
