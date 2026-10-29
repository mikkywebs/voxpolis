/**
 * Thin multi-provider LLM client for the newsroom.
 * Order: Gemini → DeepSeek → Kimi. The first one with a key that answers wins.
 * Models are configurable with env vars so you never need a code change
 * when a provider renames a model.
 *
 *   GEMINI_API_KEY,   GEMINI_MODELS   (comma list, default: gemini-flash-latest,gemini-flash-lite-latest)
 *   DEEPSEEK_API_KEY, DEEPSEEK_MODEL  (default: deepseek-chat)
 *   KIMI_API_KEY,     KIMI_MODEL      (default: moonshot-v1-32k)
 */

export interface LLMResult {
  text: string;
  provider: string;
}

const TIMEOUT_MS = 42_000;

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(system: string, user: string): Promise<LLMResult | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const models = (process.env.GEMINI_MODELS || 'gemini-flash-latest,gemini-flash-lite-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  for (const model of models) {
    try {
      const res = await withTimeout((signal) =>
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
            },
          }),
        })
      );
      if (!res.ok) {
        console.warn(`[llm] gemini ${model} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        continue;
      }
      const data = await res.json();
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .map((p: any) => p?.text || '')
        .join('')
        .trim();
      if (text) return { text, provider: `gemini:${model}` };
    } catch (e: any) {
      console.warn(`[llm] gemini ${model} failed: ${e?.message || e}`);
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
  user: string
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
      console.warn(`[llm] ${name} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text ? { text, provider: `${name}:${model}` } : null;
  } catch (e: any) {
    console.warn(`[llm] ${name} failed: ${e?.message || e}`);
    return null;
  }
}

export async function callNewsroomLLM(system: string, user: string): Promise<LLMResult> {
  const result =
    (await callGemini(system, user)) ||
    (await callOpenAICompatible(
      'deepseek',
      'https://api.deepseek.com/chat/completions',
      process.env.DEEPSEEK_API_KEY,
      process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      system,
      user
    )) ||
    (await callOpenAICompatible(
      'kimi',
      `${(process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1').replace(/\/$/, '')}/chat/completions`,
      process.env.KIMI_API_KEY,
      process.env.KIMI_MODEL || 'moonshot-v1-32k',
      system,
      user
    ));

  if (!result) {
    throw new Error('No AI provider answered. Check GEMINI_API_KEY / DEEPSEEK_API_KEY / KIMI_API_KEY in Vercel.');
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
