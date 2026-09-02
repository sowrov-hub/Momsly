/* ==========================================================================
   MOMSLY — BACKUP
   Whole-app JSON backup/restore. Lets a mom move her data between devices
   manually (export the file, AirDrop/email it, import on the new device)
   since there is no backend to sync through.
   ========================================================================== */

const Backup = (() => {

  function exportJSON() {
    const data = Storage.all();
    const safe = { ...data };
    delete safe.user; // never export password hash
    const payload = {
      app: 'Momsly', version: 1, exportedAt: Utils.nowISO(), data: safe,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `momsly-backup-${Utils.todayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    UI.toast('Backup downloaded.', 'success');
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const payload = JSON.parse(reader.result);
          if (!payload.data) throw new Error('Invalid backup file');
          const current = Storage.all();
          const merged = { ...current, ...payload.data, user: current.user, session: current.session };
          Storage.replaceAll(merged);
          UI.toast('Backup restored.', 'success');
          resolve(merged);
        } catch (e) {
          UI.toast('That file could not be read as a Momsly backup.', 'error');
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async function resetAllData() {
    const ok = await UI.confirmDialog({
      title: 'Reset all data?',
      message: 'This permanently deletes every tracker log, reminder, milestone, and setting on this device. This cannot be undone.',
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (ok) {
      // Account, trial, and premium status live in Supabase now, not in
      // this local store, so a reset here only clears on-device data
      // (tracker logs, reminders, favorites, etc.) — it can never affect
      // login state or premium/trial status.
      Storage.reset();
      UI.toast('All data reset.', 'success');
      setTimeout(() => window.location.href = 'index.html', 800);
    }
  }

  return { exportJSON, importJSON, resetAllData };
})();
