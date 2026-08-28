// ==========================================================================
// MOMSLY — ask-momsly (Supabase Edge Function)
//
// Proxies parenting questions to Google's Gemini API.
//
// WHY THIS EXISTS AT ALL, instead of calling Google from the browser:
// a Gemini API key in frontend JavaScript is readable by anyone who opens
// devtools or reads the bundle, and every call it makes is billed to your
// Google account. Keeping the key here — as a Supabase Edge Function
// secret — means it never reaches the device. This function also requires
// a valid Momsly login, so a stranger can't burn through your quota.
//
// Required Edge Function secrets:
//   GEMINI_API_KEY   from https://aistudio.google.com/apikey
//   GEMINI_MODEL     optional, defaults to gemini-2.0-flash
//
// Deploy:  supabase functions deploy ask-momsly
// Secrets: supabase secrets set GEMINI_API_KEY=...
// ==========================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Momsly's voice, plus the limits that matter when the questions are
// about somebody's baby. The model is told plainly that it is not a
// clinician and that urgent symptoms get redirected, not answered.
const SYSTEM_PROMPT = `
You are Momsly's parenting assistant, helping a parent of a young child.

Voice: warm, calm, practical, and brief. Two or three short paragraphs at
most. Talk like an experienced friend, never a lecture. Never be preachy
about feeding choices, sleep choices, or working vs staying home — parents
get enough judgement elsewhere.

Boundaries you must hold:
- You are NOT a doctor and must never diagnose, name a condition the child
  might have, or recommend a specific medicine or dosage. For anything
  about symptoms, medication amounts, growth concerns or development
  worries, give general context and then say clearly that their
  pediatrician is the right person to decide.
- If the question involves any red-flag sign — trouble breathing,
  choking, a seizure, unresponsiveness, a fever in an infant under three
  months, blood, a serious fall or head injury, dehydration, or a baby who
  cannot be roused — your FIRST line must tell them to contact emergency
  services or their doctor right now. Do not bury that under other advice.
- If you are not confident, say so rather than guessing.
- Stay on parenting, babies, and caring for the parent themselves. If
  asked something unrelated, say that's outside what you can help with
  here and offer to help with something parenting-related.

Never claim to have access to the parent's logged data in this app.
`.trim();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  try {
    if (!GEMINI_API_KEY) {
      return json({ error: 'The assistant is not configured yet.' }, 503);
    }

    // Only signed-in Momsly users may spend the quota.
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Please log in to ask a question.' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Please log in to ask a question.' }, 401);

    const { question, history } = await req.json().catch(() => ({}));
    if (!question || typeof question !== 'string' || !question.trim()) {
      return json({ error: 'Ask a question to get started.' }, 400);
    }
    if (question.length > 2000) {
      return json({ error: 'That question is a bit long — try shortening it.' }, 400);
    }

    // Only the recent turns are sent, to keep requests small and cheap.
    const priorTurns = Array.isArray(history) ? history.slice(-8) : [];
    const contents = [
      ...priorTurns
        .filter((m: any) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'model'))
        .map((m: any) => ({ role: m.role, parts: [{ text: String(m.text).slice(0, 2000) }] })),
      { role: 'user', parts: [{ text: question.trim() }] },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error('Gemini request failed', res.status, detail);
      if (res.status === 429) {
        return json({ error: "The assistant is busy right now — try again in a moment." }, 429);
      }
      return json({ error: "The assistant couldn't answer just now. Please try again." }, 502);
    }

    const data = await res.json();
    const answer = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('').trim();

    if (!answer) {
      // Usually means the model declined to answer (safety filters).
      return json({
        answer: "I couldn't answer that one. If it's about your child's health or symptoms, your pediatrician is the right person to ask.",
      });
    }

    return json({ answer });
  } catch (err: any) {
    console.error('ask-momsly failed', err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
