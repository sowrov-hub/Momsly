/* ==========================================================================
   MOMSLY — ASK MOMSLY (AI assistant)
   Client half of the parenting assistant. The Google Gemini key lives in
   the `ask-momsly` Supabase Edge Function, never here — this module only
   forwards the question and renders the reply, so nothing secret ever
   reaches the device.
   ========================================================================== */

const MomslyAI = (() => {
  const HISTORY_KEY = 'aiChat';
  const MAX_STORED = 40;

  const SUGGESTIONS = [
    'How do I get my baby to sleep longer at night?',
    'When should I start solid foods?',
    'How much tummy time does my baby need?',
    'My toddler refuses to eat vegetables — help?',
  ];

  let sending = false;

  function isConfigured() {
    return typeof SupabaseClient !== 'undefined' && SupabaseClient.isConfigured();
  }

  function history() {
    return Storage.get(HISTORY_KEY) || [];
  }

  function saveTurn(role, text) {
    const next = [...history(), { role, text, at: Utils.nowISO() }].slice(-MAX_STORED);
    Storage.set(HISTORY_KEY, next);
    return next;
  }

  function clear() {
    Storage.set(HISTORY_KEY, []);
    render();
  }

  // Sends the question to the Edge Function. Never throws — every failure
  // path comes back as { ok:false, error } so the UI can just show it.
  async function ask(question) {
    if (!isConfigured()) {
      return { ok: false, error: "The assistant isn't set up yet." };
    }
    const sb = SupabaseClient.get();
    if (!sb) return { ok: false, error: 'Unable to connect right now.' };

    try {
      const { data, error } = await sb.functions.invoke('ask-momsly', {
        body: {
          question,
          // Only the text/role pairs the function needs, most recent last.
          history: history().slice(-8).map(m => ({ role: m.role, text: m.text })),
        },
      });

      if (error) {
        // A non-2xx reply still carries our JSON error message in the body.
        let message = 'The assistant could not answer just now. Please try again.';
        try {
          const body = await error.context?.json();
          if (body?.error) message = body.error;
        } catch (_) { /* keep the default */ }
        console.warn('ask-momsly failed', error);
        return { ok: false, error: message };
      }

      if (data?.error) return { ok: false, error: data.error };
      if (!data?.answer) return { ok: false, error: 'No answer came back — please try again.' };
      return { ok: true, answer: data.answer };
    } catch (e) {
      console.warn('ask-momsly threw', e);
      return { ok: false, error: 'Unable to reach the assistant. Check your connection.' };
    }
  }

  /* ---------------- rendering ---------------- */

  // The model replies in plain prose; this keeps paragraphs and simple
  // "- " bullets readable without trusting the text as HTML.
  function formatAnswer(text) {
    return text.split(/\n{2,}/).map(block => {
      const lines = block.split('\n').filter(Boolean);
      const allBullets = lines.length > 0 && lines.every(l => /^\s*[-*•]\s+/.test(l));
      if (allBullets) {
        return `<ul>${lines.map(l => `<li>${Utils.escapeHtml(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
      }
      return `<p>${Utils.escapeHtml(block.replace(/\n/g, ' '))}</p>`;
    }).join('');
  }

  function bubble(turn) {
    const mine = turn.role === 'user';
    return `
      <div class="ai-turn ai-turn--${mine ? 'user' : 'bot'}">
        ${mine ? '' : `<span class="ai-avatar">${Icons.sparkles}</span>`}
        <div class="ai-bubble">${mine ? `<p>${Utils.escapeHtml(turn.text)}</p>` : formatAnswer(turn.text)}</div>
      </div>`;
  }

  function render() {
    const thread = document.getElementById('ai-thread');
    if (!thread) return;
    const turns = history();

    if (!turns.length) {
      thread.innerHTML = `
        <div class="ai-empty">
          <span class="ai-empty__icon">${Icons.sparkles}</span>
          <h3>Ask me anything about parenting</h3>
          <p>Sleep, feeding, milestones, or just getting through today.</p>
          <div class="ai-suggestions">
            ${SUGGESTIONS.map(s => `<button class="ai-suggestion" data-suggestion="${Utils.escapeHtml(s)}">${Utils.escapeHtml(s)}</button>`).join('')}
          </div>
        </div>`;
      thread.querySelectorAll('[data-suggestion]').forEach(b =>
        b.addEventListener('click', () => submit(b.dataset.suggestion)));
      return;
    }

    thread.innerHTML = turns.map(bubble).join('') +
      (sending ? `
        <div class="ai-turn ai-turn--bot">
          <span class="ai-avatar">${Icons.sparkles}</span>
          <div class="ai-bubble ai-bubble--thinking">Thinking…</div>
        </div>` : '');

    thread.scrollTop = thread.scrollHeight;
  }

  async function submit(question) {
    const text = (question || '').trim();
    if (!text || sending) return;

    const input = document.getElementById('ai-input');
    if (input) input.value = '';

    saveTurn('user', text);
    sending = true;
    render();
    setBusy(true);

    const result = await ask(text);

    sending = false;
    if (result.ok) {
      saveTurn('model', result.answer);
    } else {
      UI.toast(result.error, 'error');
    }
    setBusy(false);
    render();
  }

  function setBusy(busy) {
    const btn = document.getElementById('ai-send');
    const input = document.getElementById('ai-input');
    if (btn) btn.disabled = busy;
    if (input) input.disabled = busy;
    if (!busy) input?.focus();
  }

  function init() {
    const form = document.getElementById('ai-form');
    const input = document.getElementById('ai-input');

    if (!isConfigured()) {
      const notice = document.getElementById('ai-setup-notice');
      if (notice) notice.style.display = 'block';
    }

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      submit(input?.value);
    });

    // Enter sends, Shift+Enter makes a new line.
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input.value); }
    });

    document.getElementById('ai-clear')?.addEventListener('click', async () => {
      if (!history().length) return;
      const ok = await UI.confirmDialog({
        title: 'Clear this conversation?',
        message: 'Your questions and answers will be removed from this device.',
        confirmLabel: 'Clear', danger: true,
      });
      if (ok) clear();
    });

    render();
  }

  return { init, render, ask, clear, isConfigured, SUGGESTIONS };
})();
