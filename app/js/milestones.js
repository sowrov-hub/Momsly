/* ==========================================================================
   MOMSLY — MILESTONES
   Timeline of achievements per child, with optional photo/note. Marking
   one complete triggers the confetti micro-interaction from ui.js.
   ========================================================================== */

const Milestones = (() => {

  const SUGGESTED = [
    { title: 'First smile', category: 'social' },
    { title: 'Rolled over', category: 'motor' },
    { title: 'First laugh', category: 'social' },
    { title: 'Sat up unassisted', category: 'motor' },
    { title: 'First tooth', category: 'growth' },
    { title: 'Crawling', category: 'motor' },
    { title: 'First word', category: 'language' },
    { title: 'Pulled to stand', category: 'motor' },
    { title: 'First steps', category: 'motor' },
    { title: 'Waved bye-bye', category: 'social' },
  ];

  function list(childId) {
    return (Storage.get('milestones') || [])
      .filter(m => m.childId === childId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function add({ childId, title, category, date, note }) {
    const m = {
      id: Utils.uid(), childId, title, category: category || 'other',
      date: date || Utils.nowISO(), note: note || '', done: true,
      createdAt: Utils.nowISO(),
    };
    Storage.pushItem('milestones', m);
    UI.confetti();
    return m;
  }

  function toggleDone(id) {
    const list = Storage.get('milestones') || [];
    const m = list.find(x => x.id === id);
    if (!m) return;
    const done = !m.done;
    Storage.updateItem('milestones', id, { done });
    if (done) UI.confetti();
  }

  function remove(id) {
    Storage.removeItem('milestones', id);
  }

  return { SUGGESTED, list, add, toggleDone, remove };
})();
