/* ==========================================================================
   MOMSLY — SLEEP
   Premium smart sleep timer with a lightweight "sleep score" heuristic
   and a recommended-bedtime / wake-prediction estimate based on recent
   nap history. All computed locally from the child's own logged data.
   ========================================================================== */

const Sleep = (() => {
  const KEY = 'activeSleepTimer';

  function getActive() {
    const root = Storage.all();
    return root[KEY] || null;
  }

  function start(childId) {
    const root = Storage.all();
    root[KEY] = { childId, startedAt: Utils.nowISO() };
    Storage.replaceAll(root);
    return root[KEY];
  }

  function stop({ quality } = {}) {
    const active = getActive();
    if (!active) return null;
    const endedAt = new Date();
    const startedAt = new Date(active.startedAt);
    const duration = endedAt - startedAt;
    const log = {
      id: Utils.uid(),
      childId: active.childId,
      type: 'sleep',
      duration,
      quality: quality || null,
      score: sleepScore(duration, quality),
      timestamp: endedAt.toISOString(),
    };
    Storage.pushItem('logs', log);
    const root = Storage.all();
    root[KEY] = null;
    Storage.replaceAll(root);
    return log;
  }

  function cancel() {
    const root = Storage.all();
    root[KEY] = null;
    Storage.replaceAll(root);
  }

  function elapsedMs() {
    const active = getActive();
    if (!active) return 0;
    return Date.now() - new Date(active.startedAt).getTime();
  }

  function sleepScore(durationMs, quality) {
    const hours = durationMs / 3600000;
    let score = Utils.clamp(Math.round((hours / 2) * 100), 20, 100);
    if (quality === 'restless') score = Utils.clamp(score - 15, 10, 100);
    if (quality === 'peaceful') score = Utils.clamp(score + 10, 10, 100);
    return score;
  }

  function todaySummary(childId) {
    const logs = (Storage.get('logs') || []).filter(l =>
      l.type === 'sleep' && l.childId === childId && Utils.isToday(l.timestamp));
    const totalMs = logs.reduce((sum, l) => sum + (l.duration || 0), 0);
    return { count: logs.length, totalMs };
  }

  function wakePrediction(childId) {
    const active = getActive();
    if (!active || active.childId !== childId) return null;
    const logs = (Storage.get('logs') || [])
      .filter(l => l.type === 'sleep' && l.childId === childId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
    if (logs.length === 0) {
      return new Date(new Date(active.startedAt).getTime() + 90 * 60000);
    }
    const avgMs = logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length;
    return new Date(new Date(active.startedAt).getTime() + avgMs);
  }

  return { getActive, start, stop, cancel, elapsedMs, sleepScore, todaySummary, wakePrediction };
})();
