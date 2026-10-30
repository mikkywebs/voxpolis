/**
 * Thin multi-provider LLM client for the newsroom.
 * Order: Gemini → DeepSeek → Kimi. The first one with a key that answers wins.
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

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(system: string, user: string, notes: string[]): Promise<LLMResult | null> {
  // Accept the name used in Vercel (GOOGLE_STUDIO_API_KEY) as well as the standard names.
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_STUDIO_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!key) {
    notes.push('gemini: no key');
    return null;
  }
  const models = (process.env.GEMINI_MODELS || 'gemini-flash-latest,gemini-flash-lite-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  // Newer Gemini models "think" before answering, which can blow the time budget. Cap it.
  const thinkingBudget = Number(process.env.GEMINI_THINKING_BUDGET ?? 512);

  for (const model of models) {
    const t0 = Date.now();
    const attempt = async (withThinking: boolean) =>
      withTimeout((signal) =>
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
              ...(withThinking ? { thinkingConfig: { thinkingBudget } } : {}),
            },
          }),
        })
      );
    try {
      let res = await attempt(thinkingBudget >= 0);
      if (res.status === 400 && thinkingBudget >= 0) {
        // Model doesn't accept a thinking budget: retry without it.
        notes.push(`gemini:${model} rejected thinkingBudget`);
        res = await attempt(false);
      }
      if (!res.ok) {
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

export async function callNewsroomLLM(system: string, user: string): Promise<LLMResult> {
  const notes: string[] = [];
  const result =
    (await callGemini(system, user, notes)) ||
    (await callOpenAICompatible(
      'deepseek',
      'https://api.deepseek.com/chat/completions',
      process.env.DEEPSEEK_API_KEY,
      process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      system,
      user,
      notes
    )) ||
    (await callOpenAICompatible(
      'kimi',
      `${(process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1').replace(/\/$/, '')}/chat/completions`,
      process.env.KIMI_API_KEY,
      process.env.KIMI_MODEL || 'moonshot-v1-32k',
      system,
      user,
      notes
    ));

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
  return JSON.parse(s.slice(start, end + 1));
}
