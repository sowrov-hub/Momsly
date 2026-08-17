/* ==========================================================================
   MOMSLY — CHARTS
   Minimal canvas-based bar/line chart renderer. No dependency, matches
   brand gradient. Good enough for growth curves and weekly summaries;
   not a general charting library.
   ========================================================================== */

const Charts = (() => {

  function getThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      primary: styles.getPropertyValue('--color-primary').trim() || '#F472B6',
      secondary: styles.getPropertyValue('--color-secondary').trim() || '#A78BFA',
      border: styles.getPropertyValue('--color-border').trim() || '#F3E8FF',
      subtext: styles.getPropertyValue('--color-subtext').trim() || '#6B7280',
      text: styles.getPropertyValue('--color-text').trim() || '#1F2937',
    };
  }

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width: rect.width, height: rect.height };
  }

  function barChart(canvas, labels, values, { unit = '' } = {}) {
    if (!canvas || !canvas.getBoundingClientRect().width) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const colors = getThemeColors();
    ctx.clearRect(0, 0, width, height);

    const padTop = 14, padBottom = 24, padSide = 8;
    const chartH = height - padTop - padBottom;
    const max = Math.max(...values, 1);
    const barW = (width - padSide * 2) / values.length * 0.55;
    const gap = (width - padSide * 2) / values.length;

    values.forEach((v, i) => {
      const x = padSide + i * gap + (gap - barW) / 2;
      const barH = (v / max) * chartH;
      const y = padTop + (chartH - barH);
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, colors.primary);
      grad.addColorStop(1, colors.secondary);
      ctx.fillStyle = v > 0 ? grad : colors.border;
      roundRect(ctx, x, y, barW, Math.max(barH, 3), 6);
      ctx.fill();

      ctx.fillStyle = colors.subtext;
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x + barW / 2, height - 8);
    });
  }

  function lineChart(canvas, labels, values, { yLabel = '' } = {}) {
    if (!canvas || !canvas.getBoundingClientRect().width) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const colors = getThemeColors();
    ctx.clearRect(0, 0, width, height);

    const padTop = 16, padBottom = 24, padSide = 12;
    const chartW = width - padSide * 2;
    const chartH = height - padTop - padBottom;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = (max - min) || 1;

    const points = values.map((v, i) => ({
      x: padSide + (i / Math.max(values.length - 1, 1)) * chartW,
      y: padTop + chartH - ((v - min) / range) * chartH,
    }));

    // Fill under curve
    if (points.length > 1) {
      const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
      grad.addColorStop(0, 'rgba(244,114,182,0.25)');
      grad.addColorStop(1, 'rgba(244,114,182,0.02)');
      ctx.beginPath();
      ctx.moveTo(points[0].x, padTop + chartH);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padTop + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Points
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = colors.primary;
      ctx.stroke();
    });

    // Labels
    ctx.fillStyle = colors.subtext;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((l, i) => {
      if (labels.length > 6 && i % Math.ceil(labels.length / 6) !== 0) return;
      ctx.fillText(l, points[i].x, height - 6);
    });

    // Store point positions (in the same CSS-pixel space as pointer
    // events) so a click handler can hit-test which dot was tapped.
    canvas.__points = points.map((p, i) => ({ x: p.x, y: p.y, label: labels[i], value: values[i] }));
  }

  // Wires a canvas rendered by lineChart() so tapping near a dot calls
  // onPick({x, y, label, value}) with the nearest point within reach.
  // Safe to call every re-render — only binds the listener once per
  // canvas element rather than stacking duplicate handlers.
  function attachPointClickHandler(canvas, onPick, hitRadius = 16) {
    if (!canvas || canvas.__pointClickBound) return;
    canvas.__pointClickBound = true;
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', (e) => {
      const points = canvas.__points;
      if (!points || !points.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let nearest = null, nearestDist = Infinity;
      points.forEach(p => {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < nearestDist) { nearestDist = d; nearest = p; }
      });
      if (nearest && nearestDist <= hitRadius) onPick(nearest);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  return { barChart, lineChart, attachPointClickHandler };
})();
