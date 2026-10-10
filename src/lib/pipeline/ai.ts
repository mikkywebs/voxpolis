import { AIRewritePayload, ScrapedSourcePage } from './types';
import { findConsecutiveWordOverlaps } from './overlap';

const SYSTEM_PROMPT = `You are the automatic Voxpolis rewrite engine for a global political news app. Produce an original brief for readers in the story’s country, in clear English.

CORE RULES:
1. STRICT ZERO-COPY / NO VERBATIM OVERLAP: You must NEVER copy 8 or more consecutive words from extracted_full_text or source_headline. Every single sentence must be completely rephrased and recast in your own words.
2. FACTUAL FIDELITY: Use only facts, figures, names, dates, and direct quotes from extracted_full_text. Never hallucinate or invent facts.
3. If extracted text is truncated, missing key details, or paywalled, set completeness="incomplete" and provide incomplete_reason.
4. Do not paste the headline into the body or dek.
5. Separate confirmed fact from allegation; attribute speakers.
6. Keep names, dates, figures, places exact.
7. No campaign tone. No generic politics filler.
8. legislative_scope = null unless bill, vote, gazette, or binding court/regulator order.
9. Listicle: one object per item actually in the source. If source promised 10 and text has 1, incomplete.
10. JSON ONLY. No markdown formatting around the JSON.

JSON SCHEMA:
{
  "content_type": "single_story|listicle",
  "headline": "",
  "dek": "",
  "body_markdown": "",
  "executive_summary": "",
  "fact_analysis": [{"fact":"","status":"confirmed|claimed|unverified","who_said":""}],
  "why_it_matters": "",
  "legislative_scope": null,
  "items": [{"position":1,"title":"","summary":"","source":""}],
  "actors": [],
  "tags": [],
  "country_iso": "",
  "suggested_slug_keywords": "",
  "completeness": "complete|incomplete",
  "incomplete_reason": null
}`;

async function callGemini(prompt: string, payloadStr: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  const models = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-flash-latest'];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${prompt}\n\nInput Payload:\n${payloadStr}` }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 3000,
            responseMimeType: 'application/json',
          },
        }),
      });

      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text && text.length > 100) return text;
      } else {
        const err = await res.text();
        console.warn(`[Pipeline AI] Gemini ${model} HTTP ${res.status}:`, err.slice(0, 180));
      }
    } catch (err: any) {
      console.warn(`[Pipeline AI] Gemini ${model} error:`, err?.message || err);
    }
  }
  return null;
}

async function callKimi(prompt: string, payloadStr: string): Promise<string | null> {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        temperature: 0.1,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: payloadStr },
        ],
      }),
    });

    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text && text.length > 100) return text;
    }
  } catch {}
  return null;
}

async function callDeepSeek(prompt: string, payloadStr: string): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.1,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: payloadStr },
        ],
      }),
    });

    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text && text.length > 100) return text;
    }
  } catch {}
  return null;
}

export async function rewriteWithAI(
  scraped: ScrapedSourcePage,
  targetCountryCode: string = 'NG'
): Promise<AIRewritePayload> {
  const userPayload = {
    source_name: scraped.source_name,
    source_url: scraped.source_url,
    source_published_at: scraped.source_published_at,
    source_headline: scraped.source_headline,
    target_country_iso: targetCountryCode,
    extracted_full_text: scraped.extracted_full_text,
  };

  const payloadStr = JSON.stringify(userPayload);

  // 1. Primary: Gemini
  let rawOutput = await callGemini(SYSTEM_PROMPT, payloadStr);

  // 2. Fallback 1: Kimi
  if (!rawOutput) {
    rawOutput = await callKimi(SYSTEM_PROMPT, payloadStr);
  }

  // 3. Fallback 2: DeepSeek
  if (!rawOutput) {
    rawOutput = await callDeepSeek(SYSTEM_PROMPT, payloadStr);
  }

  if (!rawOutput) {
    throw new Error('All AI rewrite providers (Gemini, Kimi, DeepSeek) failed or are unreachable.');
  }

  let jsonString = rawOutput.trim();
  if (jsonString.includes('```json')) {
    jsonString = jsonString.split('```json')[1].split('```')[0].trim();
  } else if (jsonString.includes('```')) {
    jsonString = jsonString.split('```')[1].split('```')[0].trim();
  }

  try {
    const parsed: AIRewritePayload = JSON.parse(jsonString);

    if (!parsed.content_type) parsed.content_type = 'single_story';
    if (!Array.isArray(parsed.fact_analysis)) parsed.fact_analysis = [];
    if (!Array.isArray(parsed.items)) parsed.items = [];
    if (!Array.isArray(parsed.actors)) parsed.actors = [];
    if (!Array.isArray(parsed.tags)) parsed.tags = [];
    if (!parsed.country_iso) parsed.country_iso = targetCountryCode;

    // Zero-overlap verification: check for 8+ consecutive word overlaps
    const bodyOverlaps = findConsecutiveWordOverlaps(scraped.extracted_full_text, parsed.body_markdown, 8);
    if (bodyOverlaps.length > 0) {
      console.warn(`[Pipeline AI] Detected ${bodyOverlaps.length} consecutive 8+ word overlap(s) in body. Flagging incomplete.`);
      parsed.completeness = 'incomplete';
      parsed.incomplete_reason = `Consecutive 8+ word verbatim overlap detected with source text (${bodyOverlaps[0].wordCount} words: "${bodyOverlaps[0].span}")`;
    }

    return parsed;
  } catch (err: any) {
    throw new Error(`Failed to parse AI JSON output: ${err.message}. Raw output: ${rawOutput.slice(0, 300)}`);
  }
}

// Backwards compatibility export
export const rewriteWithAnthropic = rewriteWithAI;
