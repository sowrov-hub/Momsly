/* ==========================================================================
   MOMSLY — FEEDING
   Premium smart feeding timer. Persists the running timer to Storage so
   it survives a page reload or the tab being closed and reopened.
   ========================================================================== */

const Feeding = (() => {
  const KEY = 'activeFeedingTimer'; // stored inside settings-adjacent root key via custom get/set

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

  function stop({ amount, side, note } = {}) {
    const active = getActive();
    if (!active) return null;
    const endedAt = new Date();
    const startedAt = new Date(active.startedAt);
    const log = {
      id: Utils.uid(),
      childId: active.childId,
      type: 'feeding',
      amount: amount || null,
      side: side || null,
      note: note || '',
      duration: endedAt - startedAt,
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

  // Predict next feed based on the average gap between the last few feeding logs.
  function nextFeedPrediction(childId) {
    const logs = (Storage.get('logs') || [])
      .filter(l => l.type === 'feeding' && l.childId === childId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (logs.length === 0) return null;
    const last = new Date(logs[0].timestamp);
    if (logs.length < 2) {
      return new Date(last.getTime() + 3 * 3600000); // default 3h gap
    }
    const gaps = [];
    for (let i = 0; i < Math.min(logs.length - 1, 5); i++) {
      gaps.push(new Date(logs[i].timestamp) - new Date(logs[i + 1].timestamp));
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return new Date(last.getTime() + avgGap);
  }

  function todaySummary(childId) {
    const logs = (Storage.get('logs') || []).filter(l =>
      l.type === 'feeding' && l.childId === childId && Utils.isToday(l.timestamp));
    const totalOz = logs.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    return { count: logs.length, totalOz };
  }

  function weekSummary(childId) {
    const logs = (Storage.get('logs') || []).filter(l =>
      l.type === 'feeding' && l.childId === childId && Utils.daysAgo(l.timestamp) < 7);
    const byDay = {};
    logs.forEach(l => {
      const key = Utils.todayKey(new Date(l.timestamp));
      byDay[key] = (byDay[key] || 0) + (Number(l.amount) || 0);
    });
    return byDay;
  }

  return { getActive, start, stop, cancel, elapsedMs, nextFeedPrediction, todaySummary, weekSummary };
})();
