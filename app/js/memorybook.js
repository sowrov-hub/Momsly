/* ==========================================================================
   MOMSLY — MEMORY BOOK
   Drives the "Photo Memories" sheet on tools.html: a page-by-page photo
   album — 2 titled photos per page, styled like a physical scrapbook
   page. Each page can be downloaded as a standalone PDF (via html2canvas
   + jsPDF, loaded from CDN) matching the page's own aspect ratio.
   ========================================================================== */

const MemoryBook = (() => {
  const PHOTOS_PER_PAGE = 2;
  const MAX_PHOTO_SIZE = 900;

  let currentPage = 0;
  let pendingDataUrl = null;

  function activeChildId() {
    const children = Storage.get('children') || [];
    return Storage.get('activeChildId') || children[0]?.id || null;
  }

  function photosForChild() {
    const childId = activeChildId();
    return (Storage.get('photos') || [])
      .filter(p => !childId || p.childId === childId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  function pages() {
    const photos = photosForChild();
    const chunks = [];
    for (let i = 0; i < photos.length; i += PHOTOS_PER_PAGE) chunks.push(photos.slice(i, i + PHOTOS_PER_PAGE));
    return chunks;
  }

  function resizeImageFile(file, maxSize = MAX_PHOTO_SIZE) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) { reject(new Error('not an image')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height) { if (width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; } }
          else { if (height > maxSize) { width = Math.round(width * (maxSize / height)); height = maxSize; } }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        };
        img.onerror = () => reject(new Error('image failed to load'));
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleFileChosen(file) {
    resizeImageFile(file).then(dataUrl => {
      pendingDataUrl = dataUrl;
      document.getElementById('photo-caption-preview-img').src = dataUrl;
      document.getElementById('photo-caption-input').value = '';
      document.getElementById('photo-desc-input').value = '';
      document.getElementById('photo-add-label').style.display = 'none';
      document.getElementById('photo-caption-form').style.display = 'block';
      setTimeout(() => document.getElementById('photo-caption-input').focus(), 100);
    }).catch(() => UI.toast("Couldn't load that photo — try a different file.", 'error'));
  }

  function cancelCaption() {
    pendingDataUrl = null;
    document.getElementById('photo-caption-form').style.display = 'none';
    document.getElementById('photo-add-label').style.display = 'block';
  }

  function saveCaption() {
    const input = document.getElementById('photo-caption-input');
    const title = input.value.trim();
    const description = document.getElementById('photo-desc-input').value.trim();
    if (!title) { UI.toast('Give this memory a title, like "First smile."', 'error'); input.focus(); return; }
    if (!pendingDataUrl) return;

    const photos = Storage.get('photos') || [];
    photos.push({ id: Utils.uid(), childId: activeChildId(), url: pendingDataUrl, caption: title, description, date: Utils.nowISO() });
    Storage.set('photos', photos);

    pendingDataUrl = null;
    document.getElementById('photo-caption-form').style.display = 'none';
    document.getElementById('photo-add-label').style.display = 'block';

    currentPage = Math.max(0, pages().length - 1); // jump to the page holding the new photo
    render();
    UI.toast('Memory added! 💗', 'success');
  }

  function deletePhoto(id) {
    UI.confirmDialog({ title: 'Delete this memory?', message: 'This photo will be permanently removed.', confirmLabel: 'Delete', danger: true })
      .then(ok => {
        if (!ok) return;
        Storage.set('photos', (Storage.get('photos') || []).filter(p => p.id !== id));
        render();
      });
  }

  function goPrev() { if (currentPage > 0) { currentPage--; render(); } }
  function goNext() { const last = pages().length - 1; if (currentPage < last) { currentPage++; render(); } }

  // Rasterizes the current page node exactly as shown on screen (frames,
  // tape accents, alternating layout) and saves it as a PDF sized to
  // match that same aspect ratio — no system print dialog involved.
  async function downloadPagePDF() {
    const btn = document.getElementById('memory-print');
    const node = document.getElementById('memory-page');
    if (!btn || !node) return;
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
      UI.toast("Couldn't load the PDF tool — check your connection and try again.", 'error');
      return;
    }

    const originalLabel = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Preparing PDF…';

    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: '#FFFBF3',
        useCORS: true,
        ignoreElements: (el) => el.classList && el.classList.contains('no-print'),
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`memory-book-page-${currentPage + 1}.pdf`);
    } catch (err) {
      console.warn('Memory Book PDF export failed', err);
      UI.toast("Couldn't create the PDF — try again.", 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalLabel;
    }
  }

  function pageHTML(pagePhotos) {
    return `
      <div class="memory-page" id="memory-page">
        ${pagePhotos.map(p => `
          <div class="memory-row">
            <figure class="memory-row__photo-frame">
              <button class="icon-btn memory-row__delete no-print" data-delete-photo="${p.id}" aria-label="Delete photo">${Icons.trash}</button>
              <div class="memory-row__photo"><img src="${p.url}" alt="${Utils.escapeHtml(p.caption || '')}"></div>
            </figure>
            <div class="memory-row__text">
              <span class="memory-row__title">${Utils.escapeHtml(p.caption || 'Untitled memory')}</span>
              ${p.description ? `<p class="memory-row__desc">${Utils.escapeHtml(p.description)}</p>` : ''}
              <span class="memory-row__date">${Utils.formatDate(p.date)}</span>
            </div>
          </div>`).join('')}
      </div>
      <div class="memory-book-controls no-print">
        <button class="icon-btn" id="memory-prev" aria-label="Previous page" ${currentPage === 0 ? 'disabled' : ''}>${Icons.chevronLeft}</button>
        <span class="memory-page-indicator">Page ${currentPage + 1} of ${pages().length}</span>
        <button class="icon-btn" id="memory-next" aria-label="Next page" ${currentPage >= pages().length - 1 ? 'disabled' : ''}>${Icons.chevronRight}</button>
      </div>
      <button class="btn btn--secondary no-print" id="memory-print" style="margin-top:var(--space-sm);">${Icons.download} Download as PDF</button>`;
  }

  function render() {
    const mount = document.getElementById('memory-book-mount');
    if (!mount) return;
    const allPages = pages();

    if (currentPage > allPages.length - 1) currentPage = Math.max(0, allPages.length - 1);

    if (!allPages.length) {
      mount.innerHTML = Components.emptyState({ icon: 'camera', title: 'No memories yet', subtitle: 'Add your first photo above to start the album.' });
      return;
    }

    mount.innerHTML = pageHTML(allPages[currentPage]);

    mount.querySelectorAll('[data-delete-photo]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deletePhoto(btn.dataset.deletePhoto); });
    });
    document.getElementById('memory-prev')?.addEventListener('click', goPrev);
    document.getElementById('memory-next')?.addEventListener('click', goNext);
    document.getElementById('memory-print')?.addEventListener('click', downloadPagePDF);
  }

  function init() {
    currentPage = 0;
    document.getElementById('photo-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      e.target.value = ''; // allow re-selecting the same file later
      if (file) handleFileChosen(file);
    });
    document.getElementById('photo-caption-cancel')?.addEventListener('click', cancelCaption);
    document.getElementById('photo-caption-save')?.addEventListener('click', saveCaption);
    render();
  }

  return { init, render };
})();
