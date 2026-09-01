/* ==========================================================================
   MOMSLY — EXPORT
   CSV export downloads a real .csv file. PDF export opens a clean,
   print-formatted report the user can "Save as PDF" from the system
   print dialog — reliable with zero dependencies and no backend.
   ========================================================================== */

const Exporter = (() => {

  function logsToCSV(logs) {
    const headers = ['id', 'childId', 'type', 'timestamp', 'amount', 'duration', 'value', 'note'];
    const rows = logs.map(l => headers.map(h => {
      const v = l[h];
      if (v === undefined || v === null) return '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    }).join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  function downloadCSV(filename = 'momsly-export.csv') {
    const logs = Storage.get('logs') || [];
    if (logs.length === 0) { UI.toast('No tracker data to export yet.'); return; }
    const csv = logsToCSV(logs);
    const blob = new Blob([csv], { type: 'text/csv' });
    triggerDownload(blob, filename);
    UI.toast('CSV exported.', 'success');
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openPDFReport() {
    const logs = (Storage.get('logs') || []).slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const child = (Storage.get('children') || []).find(c => c.id === Storage.get('activeChildId'));
    if (logs.length === 0) { UI.toast('No tracker data to export yet.'); return; }

    const win = window.open('', '_blank');
    if (!win) { UI.toast('Please allow pop-ups to export a PDF.', 'error'); return; }

    const rows = logs.slice(0, 200).map(l => `
      <tr>
        <td>${Utils.escapeHtml(Utils.formatDateTime(l.timestamp))}</td>
        <td>${Utils.escapeHtml(l.type)}</td>
        <td>${Utils.escapeHtml(l.amount ?? l.value ?? l.duration ?? '')}</td>
        <td>${Utils.escapeHtml(l.note || '')}</td>
      </tr>`).join('');

    win.document.write(`
      <html><head><title>Momsly Report</title>
      <style>
        body { font-family: -apple-system, Inter, sans-serif; color: #1F2937; padding: 32px; }
        h1 { color: #F472B6; margin-bottom: 4px; }
        p.meta { color: #6B7280; margin-bottom: 24px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #F3E8FF; font-size: 13px; }
        th { color: #A78BFA; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
        @media print { body { padding: 0; } }
      </style></head><body>
        <h1>Momsly Tracker Report</h1>
        <p class="meta">${child ? Utils.escapeHtml(child.name) + ' · ' : ''}Generated ${Utils.escapeHtml(Utils.formatDateTime(new Date()))} · ${logs.length} entries</p>
        <table><thead><tr><th>Date</th><th>Type</th><th>Value</th><th>Note</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  return { downloadCSV, openPDFReport, logsToCSV };
})();
