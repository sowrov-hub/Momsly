/* ==========================================================================
   MOMSLY — LOGIC (AI Daily Planner)
   A deterministic, pediatric-guideline-informed rule engine — not a call
   to a hosted LLM (the app has no backend), but genuinely adaptive to the
   inputs, which is what actually helps a mom at 6am: wake windows that
   scale with age, evenly spaced naps, and feed timing around them.
   ========================================================================== */

const Planner = (() => {

  // Rough age-based wake windows (minutes awake between sleeps) —
  // approximate ranges commonly used in infant sleep guidance.
  function wakeWindowFor(ageMonths) {
    if (ageMonths < 2) return 50;
    if (ageMonths < 4) return 75;
    if (ageMonths < 6) return 105;
    if (ageMonths < 9) return 150;
    if (ageMonths < 12) return 180;
    if (ageMonths < 18) return 240;
    return 300;
  }

  function feedIntervalFor(ageMonths, feedingStyle) {
    if (ageMonths < 1) return 120;
    if (ageMonths < 3) return 150;
    if (ageMonths < 6) return 180;
    if (feedingStyle === 'solids') return 240;
    return 210;
  }

  function generate({ ageMonths, wakeTime, napCount, feedingStyle }) {
    const wakeWindow = wakeWindowFor(ageMonths);
    const feedInterval = feedIntervalFor(ageMonths, feedingStyle);
    const [h, m] = wakeTime.split(':').map(Number);
    let cursor = new Date();
    cursor.setHours(h, m, 0, 0);

    const schedule = [];
    schedule.push({ time: fmt(cursor), label: 'Wake up & morning feed', type: 'feeding' });

    let nextFeed = addMin(cursor, feedInterval);
    let remainingNaps = napCount;
    let bedtimeHour = ageMonths < 6 ? 19.5 : ageMonths < 24 ? 19 : 19.5;

    while (remainingNaps > 0) {
      const napStart = addMin(cursor, wakeWindow);
      if (napStart.getHours() >= bedtimeHour - 1.5) break;

      // Insert any feed that falls before this nap
      if (nextFeed <= napStart) {
        schedule.push({ time: fmt(nextFeed), label: 'Feeding', type: 'feeding' });
        nextFeed = addMin(nextFeed, feedInterval);
      }

      const napLength = ageMonths < 6 ? 90 : ageMonths < 12 ? 75 : 60;
      const napEnd = addMin(napStart, napLength);
      schedule.push({ time: fmt(napStart), label: `Nap ${napCount - remainingNaps + 1}`, type: 'sleep' });
      schedule.push({ time: fmt(napEnd), label: 'Wake from nap', type: 'sleep' });

      cursor = napEnd;
      remainingNaps--;
    }

    // Fill remaining feeds & activities until bedtime
    const bedtime = new Date(); bedtime.setHours(Math.floor(bedtimeHour), (bedtimeHour % 1) * 60, 0, 0);
    while (nextFeed < bedtime) {
      schedule.push({ time: fmt(nextFeed), label: 'Feeding', type: 'feeding' });
      nextFeed = addMin(nextFeed, feedInterval);
    }
    if (ageMonths >= 4) {
      schedule.push({ time: fmt(addMin(cursor, 30)), label: 'Playtime / tummy time', type: 'activity' });
    }
    schedule.push({ time: fmt(addMin(bedtime, -30)), label: 'Bath & wind-down routine', type: 'sleep' });
    schedule.push({ time: fmt(bedtime), label: 'Bedtime', type: 'sleep' });

    schedule.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return schedule;
  }

  function addMin(date, minutes) { return new Date(date.getTime() + minutes * 60000); }
  function fmt(date) { return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  function timeToMinutes(label) {
    const d = new Date('1970/01/01 ' + label);
    return d.getHours() * 60 + d.getMinutes();
  }

  return { generate };
})();
