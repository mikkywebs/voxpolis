/**
 * Thin multi-provider LLM client for the newsroom.
 * Order: Gemini (Flash-Lite, Gemma 3, Flash) → Groq → DeepSeek → Kimi. The first one with a key that answers wins.
 * Models are configurable with env vars so you never need a code change
 * when a provider renames a model.
 *
 *   GEMINI_API_KEY (or GOOGLE_STUDIO_API_KEY), GEMINI_MODELS   (comma list, default: gemini-flash-latest,gemini-flash-lite-latest)
 *   DEEPSEEK_API_KEY, DEEPSEEK_MODEL  (default: deepseek-chat)
 *   KIMI_API_KEY,     KIMI_MODEL      (default: moonshot-v1-32k)
 */

export interface LLMResult {
  text: string;
  provider: string;
  notes: string[]; // why earlier providers/models were skipped (stored in ingest_log)
}

const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 28_000);

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

// Models that ran out of free quota (429) or refused the key are skipped for a while,
// so one run doesn't waste its time budget on them again.
const resting = new Map<string, number>();
const isResting = (name: string) => (resting.get(name) || 0) > Date.now();
const rest = (name: string, minutes: number) => resting.set(name, Date.now() + minutes * 60_000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(system: string, user: string, notes: string[], schema?: object): Promise<LLMResult | null> {
  // Accept the name used in Vercel (GOOGLE_STUDIO_API_KEY) as well as the standard names.
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_STUDIO_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!key) {
    notes.push('gemini: no key');
    return null;
  }
  // Lite first: fast and reliable within our time budget. Each model has its own free daily allowance,
  // so several models give more free capacity. Override with GEMINI_MODELS.
  // Gemma 3 (Google's open model) has a very large free allowance (about 14,400 requests a day) on the same key.
  const models = (process.env.GEMINI_MODELS || 'gemini-flash-lite-latest,gemma-3-27b-it,gemini-flash-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  // Newer Gemini models "think" before answering, which can blow the time budget. Cap it.
  const thinkingBudget = Number(process.env.GEMINI_THINKING_BUDGET ?? 512);

  for (const model of models) {
    if (isResting(`gemini:${model}`)) {
      notes.push(`gemini:${model} skipped (free allowance used up recently)`);
      continue;
    }
    const t0 = Date.now();
    const gemma = model.startsWith('gemma');
    const attempt = async (withThinking: boolean, withSchema: boolean) =>
      gemma
        ? // Gemma takes no system instruction, JSON mode or thinking settings: instructions go first in the message
          // and the JSON is read from the reply. It is slower, so it gets more time.
          withTimeout(
            (signal) =>
              fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: 'POST',
                signal,
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                body: JSON.stringify({
                  contents: [
                    {
                      role: 'user',
                      parts: [{ text: `${system}\n\nReply with ONE JSON object only, no other text.${schema ? `\nJSON fields (schema): ${JSON.stringify(schema)}` : ''}\n\n${user}` }],
                    },
                  ],
                  generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
                }),
              }),
            Number(process.env.GEMMA_TIMEOUT_MS || 45_000)
          )
        : withTimeout((signal) =>
        fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
              // Structured output: the model must return exactly this shape (no broken JSON).
              ...(schema && withSchema ? { responseSchema: schema } : {}),
              ...(withThinking ? { thinkingConfig: { thinkingBudget } } : {}),
            },
          }),
        })
      );
    try {
      let res = await attempt(thinkingBudget >= 0, true);
      if (!gemma && res.status === 400 && thinkingBudget >= 0) {
        // Model doesn't accept a thinking budget: retry without it.
        notes.push(`gemini:${model} 400 with thinkingBudget (${(await res.clone().text()).slice(0, 60).replace(/\s+/g, ' ')})`);
        res = await attempt(false, true);
      }
      if (!gemma && res.status === 400 && schema) {
        // Model doesn't accept the output template: plain JSON mode still works (parser repairs small slips).
        notes.push(`gemini:${model} 400 with schema (${(await res.clone().text()).slice(0, 60).replace(/\s+/g, ' ')})`);
        res = await attempt(false, false);
      }
      if (res.status === 503) {
        // Google busy ("high demand"): usually passes within seconds. One retry.
        notes.push(`gemini:${model} busy (503), retrying`);
        await sleep(2500);
        res = await attempt(thinkingBudget >= 0, true);
        // Still busy: skip this model for 15 minutes so the next runs go straight to the others.
        if (res.status === 503) rest(`gemini:${model}`, 15);
      }
      if (!res.ok) {
        if (res.status === 429) rest(`gemini:${model}`, 60);
        if (res.status === 404) rest(`gemini:${model}`, 24 * 60); // model name not available on this key
        notes.push(`gemini:${model} HTTP ${res.status} ${(await res.text()).slice(0, 120).replace(/\s+/g, ' ')}`);
        continue;
      }
      const data = await res.json();
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .filter((p: any) => !p?.thought)
        .map((p: any) => p?.text || '')
        .join('')
        .trim();
      if (text) return { text, provider: `gemini:${model} ${Math.round((Date.now() - t0) / 1000)}s`, notes };
      notes.push(`gemini:${model} empty reply (${data?.candidates?.[0]?.finishReason || 'no candidate'})`);
    } catch (e: any) {
      notes.push(`gemini:${model} ${e?.name === 'AbortError' ? `timeout after ${Math.round((Date.now() - t0) / 1000)}s` : e?.message || e}`);
    }
  }
  return null;
}

async function callOpenAICompatible(
  name: string,
  url: string,
  key: string | undefined,
  model: string,
  system: string,
  user: string,
  notes: string[]
): Promise<LLMResult | null> {
  if (!key?.trim()) return null;
  if (isResting(name)) {
    notes.push(`${name} skipped (no credit or key refused recently)`);
    return null;
  }
  try {
    const res = await withTimeout((signal) =>
      fetch(url, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.trim()}` },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: 6000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      })
    );
    if (!res.ok) {
      // 401 = key refused, 402 = no credit, 429 = limit: don't try again for a while.
      if ([401, 402, 403, 429].includes(res.status)) rest(name, 6 * 60);
      notes.push(`${name} HTTP ${res.status} ${(await res.text()).slice(0, 120).replace(/\s+/g, ' ')}`);
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) notes.push(`${name} empty reply`);
    return text ? { text, provider: `${name}:${model}`, notes } : null;
  } catch (e: any) {
    notes.push(`${name} ${e?.name === 'AbortError' ? 'timeout' : e?.message || e}`);
    return null;
  }
}

/** Kimi keys from platform.moonshot.ai only work on the international address; China keys on .cn. Try the right one first. */
async function callKimi(system: string, user: string, notes: string[]): Promise<LLMResult | null> {
  const bases = process.env.KIMI_BASE_URL ? [process.env.KIMI_BASE_URL] : ['https://api.moonshot.ai/v1', 'https://api.moonshot.cn/v1'];
  for (let i = 0; i < bases.length; i++) {
    const base = bases[i];
    const name = i === 0 ? 'kimi' : 'kimi-cn';
    const r = await callOpenAICompatible(name, `${base.replace(/\/$/, '')}/chat/completions`, process.env.KIMI_API_KEY, process.env.KIMI_MODEL || 'moonshot-v1-32k', system, user, notes);
    if (r) return r;
  }
  return null;
}

export async function callNewsroomLLM(system: string, user: string, schema?: object): Promise<LLMResult> {
  const notes: string[] = [];
  const result =
    (await callGemini(system, user, notes, schema)) ||
    // Groq: free plan, no card (about 1,000 requests and 100K tokens a day on Llama 3.3 70B). Needs GROQ_API_KEY.
    (await callOpenAICompatible(
      'groq',
      'https://api.groq.com/openai/v1/chat/completions',
      process.env.GROQ_API_KEY,
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      system,
      user,
      notes
    )) ||
    (await callOpenAICompatible(
      'deepseek',
      'https://api.deepseek.com/chat/completions',
      process.env.DEEPSEEK_API_KEY,
      process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      system,
      user,
      notes
    )) ||
    (await callKimi(system, user, notes));

  if (!result) {
    throw new Error(`No AI provider answered: ${notes.join(' | ') || 'no keys set (GOOGLE_STUDIO_API_KEY / DEEPSEEK_API_KEY / KIMI_API_KEY)'}`);
  }
  return result;
}

/** Pull the first JSON object out of a model reply (handles ``` fences and stray text). */
export function parseJsonReply<T = any>(raw: string): T {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI reply had no JSON object');
  const body = s.slice(start, end + 1);
  try {
    return JSON.parse(body);
  } catch {
    // Light repair for common model slips: trailing commas, smart quotes around keys, stray placeholders.
    const repaired = body
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/<text omitted>|\.\.\.\s*\]/g, ']')
      .replace(/\n\s*\/\/[^\n]*/g, '\n');
    return JSON.parse(repaired);
  }
}
