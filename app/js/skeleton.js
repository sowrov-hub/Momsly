/* ==========================================================================
   MOMSLY — SKELETON SCREENS
   Content-shaped placeholders shown while Auth.init() completes its
   Supabase session + profile round-trip.

   Before this, every page awaited auth BEFORE mounting the shell, so the
   whole screen — header, nav and all — stayed blank for the length of a
   network request. Now the shell paints immediately, these placeholders
   stand in for the content, and each page's own render overwrites them.

   Nothing here needs to be torn down: every real render sets innerHTML on
   the same containers, so the skeleton is replaced by definition.
   ========================================================================== */

const Skeleton = (() => {

  /* ---- primitives ---- */
  const line = (w, h = 12) => `<div class="sk sk--line" style="width:${w};height:${h}px;"></div>`;
  const block = (h, extra = '') => `<div class="sk" style="height:${h}px;${extra}"></div>`;
  const circle = (d) => `<div class="sk sk--circle" style="width:${d}px;height:${d}px;flex:0 0 ${d}px;"></div>`;
  const card = (inner) => `<div class="sk-card">${inner}</div>`;
  const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');

  /* ---- composites that mirror real components ---- */
  const logRow = () => card(`<div class="sk-row">${circle(40)}
      <div class="sk-stack">${line('55%')}${line('35%', 10)}</div>${line('42px', 14)}</div>`);

  const toolCard = () => card(`<div class="sk-stack">${block(40, 'width:40px;border-radius:12px;')}
      ${line('75%', 13)}${line('90%', 10)}${line('60%', 10)}</div>`);

  const statCard = () => card(`<div class="sk-row">${circle(44)}
      <div class="sk-stack">${line('45%', 10)}${line('60%', 18)}</div></div>`);

  const formCard = () => card(`<div class="sk-stack">
      ${line('30%', 11)}${block(48)}${line('34%', 11)}${block(48)}${block(48, 'border-radius:999px;margin-top:6px;')}</div>`);

  /* ---- per-page layouts, keyed to each page's real mount points ---- */
  const PAGES = {
    home: {
      '#home-hero': `<div class="sk-stack">${line('55%', 10)}${line('95%', 22)}${line('80%', 22)}${line('45%', 22)}</div>`,
      '#hero-stats-card': `<div class="sk-list">${repeat(3, () => card(`<div class="sk-stack">${line('35%', 18)}${line('60%', 10)}</div>`))}</div>`,
      '#quick-actions': repeat(4, () => block(66, 'border-radius:18px;')),
      '#calendar-mount': card(`<div class="sk-stack">${line('45%', 14)}
        <div class="sk-week">${repeat(7, () => block(56, 'border-radius:14px;'))}</div></div>`),
      '#today-summary': `<div class="sk-list">${repeat(2, logRow)}</div>`,
      '#baby-expenses-section': `<div class="sk-list">${card(`<div class="sk-stack" style="align-items:center;">${line('30%', 10)}${line('45%', 24)}</div>`)}${logRow()}</div>`,
      '#daily-tip': card(`<div class="sk-stack">${line('28%', 10)}${line('100%', 11)}${line('85%', 11)}</div>`),
      '#recent-tools': repeat(4, toolCard),
    },
    tracker: {
      '#tracker-tabs': repeat(5, () => block(42, 'width:104px;border-radius:999px;flex:0 0 104px;')),
      '#quick-form': `<div class="sk-stack">${line('30%', 11)}${block(48)}${line('34%', 11)}${block(48)}${block(48, 'border-radius:999px;margin-top:6px;')}</div>`,
      '#history-list': `<div class="sk-list">${repeat(4, logRow)}</div>`,
    },
    tools: {
      '#category-chips': repeat(5, () => block(34, 'width:86px;border-radius:999px;flex:0 0 86px;')),
      '#tool-grid': repeat(6, toolCard),
    },
    saved: { '#saved-grid': repeat(4, toolCard) },
    profile: {
      '#profile-header': `<div class="sk-stack" style="align-items:center;">${circle(84)}${line('45%', 18)}${line('60%', 12)}</div>`,
      '#children-list': `<div class="sk-list">${repeat(2, logRow)}</div>`,
      '#baby-details': card(`<div class="sk-stack">${line('40%', 16)}
        <div class="sk-grid-2">${block(70, 'border-radius:18px;')}${block(70, 'border-radius:18px;')}</div>${block(48)}</div>`),
    },
    medicine: {
      '#medications-grid': `<div class="sk-list">${repeat(2, () => card(`<div class="sk-stack">
        <div class="sk-row">${block(40, 'width:40px;border-radius:12px;flex:0 0 40px;')}${line('72px', 22)}</div>
        ${line('55%', 18)}${line('40%', 11)}${block(1, 'margin:4px 0;')}
        <div class="sk-row">${line('40%', 14)}${line('90px', 30)}</div></div>`))}</div>`,
      '#vaccine-timeline': `<div class="sk-stack">${repeat(4, () => `<div class="sk-row">${circle(16)}
        <div class="sk-stack">${line('35%', 13)}${line('85%', 10)}</div></div>`)}</div>`,
      '#health-logs': `<div class="sk-list">${repeat(3, statCard)}</div>`,
    },
    growth: {
      '#growth-summary': `<div class="sk-list">${repeat(2, statCard)}</div>`,
      '#growth-form': `<div class="sk-stack">${line('30%', 11)}${block(48)}${line('34%', 11)}${block(48)}${block(48, 'border-radius:999px;margin-top:6px;')}</div>`,
      '#growth-history': `<div class="sk-list">${repeat(4, logRow)}</div>`,
    },
  };

  function show(page) {
    const layout = PAGES[page];
    if (!layout) return;
    for (const [selector, html] of Object.entries(layout)) {
      const el = document.querySelector(selector);
      if (el) el.innerHTML = html;
    }
  }

  return { show, line, block, circle, card };
})();
