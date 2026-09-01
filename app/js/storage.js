/* ==========================================================================
   MOMSLY — STORAGE
   Thin, safe wrapper around localStorage. Everything lives under one
   namespaced root object so backup/restore and reset are trivial.
   ========================================================================== */

const Storage = (() => {
  const NS = 'momsly:v1';

  const DEFAULTS = {
    // Account identity, trial, and premium status live in Supabase now
    // (see js/auth.js + the `profiles` table) — never here. Nothing in
    // this file's schema represents login/subscription state anymore.
    children: [],                 // [{ id, name, dob, sex, avatarColorSeed }]
    activeChildId: null,
    logs: [],                     // tracker entries: { id, childId, type, ...fields, timestamp }
    reminders: [],                 // { id, title, category, time, repeat, enabled, childId }
    milestones: [],                // { id, childId, title, category, date, note, photo, done }
    favorites: [],                 // tool ids
    settings: {
      theme: 'light',
      notifications: true,
      units: 'imperial'
    },
    moodLog: [],                    // { id, date, mood, note }
    checklists: {},                  // { hospitalBag: [{text, done}], school: [...], packing: [...] }
    budget: { entries: [] },          // { id, label, amount, category, date }
    savingsGoal: null,                 // { name, target, saved }
    medications: [],                     // { id, childId, name, dose, schedule('daily'|'asneeded'), time, reminderId }
    appointments: [],                    // { id, childId, title, doctor, when(ISO), note } — dated, never notified
    photos: [],                          // { id, childId, url(dataURL), caption, date, milestoneId }
    profilePhoto: null,                   // dataURL of the parent's own profile picture
    dailyPlan: null,                       // { date, schedule, generatedAt } — today's AI Daily Planner output, if generated
  };

  function readRoot() {
    try {
      const raw = localStorage.getItem(NS);
      if (!raw) return structuredCloneSafe(DEFAULTS);
      const parsed = JSON.parse(raw);
      return { ...structuredCloneSafe(DEFAULTS), ...parsed };
    } catch (e) {
      console.warn('Momsly storage read failed, resetting to defaults', e);
      return structuredCloneSafe(DEFAULTS);
    }
  }

  function structuredCloneSafe(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function writeRoot(data) {
    try {
      localStorage.setItem(NS, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Momsly storage write failed', e);
      return false;
    }
  }

  function get(key) {
    const root = readRoot();
    return root[key];
  }

  function set(key, value) {
    const root = readRoot();
    root[key] = value;
    return writeRoot(root);
  }

  function update(key, updaterFn) {
    const root = readRoot();
    root[key] = updaterFn(root[key]);
    writeRoot(root);
    return root[key];
  }

  function pushItem(key, item) {
    const root = readRoot();
    if (!Array.isArray(root[key])) root[key] = [];
    root[key].push(item);
    writeRoot(root);
    return item;
  }

  function removeItem(key, id) {
    const root = readRoot();
    if (!Array.isArray(root[key])) return;
    root[key] = root[key].filter(i => i.id !== id);
    writeRoot(root);
  }

  function updateItem(key, id, patch) {
    const root = readRoot();
    if (!Array.isArray(root[key])) return null;
    const idx = root[key].findIndex(i => i.id === id);
    if (idx === -1) return null;
    root[key][idx] = { ...root[key][idx], ...patch };
    writeRoot(root);
    return root[key][idx];
  }

  function all() {
    return readRoot();
  }

  function replaceAll(data) {
    return writeRoot({ ...structuredCloneSafe(DEFAULTS), ...data });
  }

  function reset() {
    localStorage.removeItem(NS);
  }

  return { get, set, update, pushItem, removeItem, updateItem, all, replaceAll, reset, DEFAULTS };
})();
