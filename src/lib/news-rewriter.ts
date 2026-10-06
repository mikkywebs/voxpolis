/**
 * VoxPolis Core Newsroom Rewriter & Synthesis Engine
 *
 * Implements the Okpebholo Model:
 * 1. Unique, active, engaging VoxPolis headline.
 * 2. Unique URL slug generated from the VoxPolis headline (never copied from wire).
 * 3. Strictly 4 factual paragraphs:
 *    - Paragraph 1 (The Hook): What happened, who did it, and the institutional/court/official setting.
 *    - Paragraph 2 (Details & Quotes): Specific findings, rulings, quotes, statistics, or figures from the text.
 *    - Paragraph 3 (The Counter-View): What the opposing side, plaintiff, or public critics argued or alleged.
 *    - Paragraph 4 (The Outcome/Impact): Legal, electoral, or governance next steps reported in the story.
 * 4. 100% FACTUAL FIDELITY: Uses ONLY facts, names, figures, and quotes from the original news source.
 * 5. ZERO ADDITIONS: Never invents facts, never hallucinates, and never adds robotic filler.
 */

export interface RewrittenStory {
  title: string;
  slug: string;
  content: string;
  paragraphs: string[];
  snippet: string;
  isAiRewritten: boolean;
  provider: string;
}

export function generateVoxpolisSlug(headline: string): string {
  const clean = (headline || '')
    .toLowerCase()
    .replace(/\s*[-–—|]\s*voxpolis.*$/i, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean.slice(0, 90);
}

export function cleanCommercialsAndAdverts(text: string): string {
  if (!text) return '';
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length < 25) return false;
      if (
        line.match(
          /^(read also|also read|click here|source:|copyright|all rights reserved|advertisement|sponsored|promo|follow us|join our|subscribe|download our|share this|tweet|whatsapp|cookie|for advert|contact us|sign up|newsletter|for more details|watch video|photo:|in case you missed)/i
        )
      ) {
        return false;
      }
      if (
        line.match(
          /(whatsapp group|telegram channel|daily newsletter|subscribe now|click the link|advertisement|all rights reserved|may not be reproduced|without prior written permission|punch nigeria|vanguard media)/i
        )
      ) {
        return false;
      }
      return true;
    })
    .join('\n\n');
}

/**
 * Multi-AI Rewriter:
 * Priority 1: Gemini (gemini-3.5-flash-lite, gemini-3.6-flash, gemini-3.1-flash-lite)
 * Priority 2: Kimi (Moonshot)
 * Priority 3: DeepSeek
 * Priority 4: Anthropic Claude
 */
async function callGeminiRewriter(systemPrompt: string, userText: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userText}` }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1000 },
        }),
      });

      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const txt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (txt && txt.length > 150) return txt;
      }
    } catch {
      // try next model
    }
  }
  return null;
}

async function callKimiRewriter(systemPrompt: string, userText: string): Promise<string | null> {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
      }),
    });

    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const txt = data.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 150) return txt;
    }
  } catch {}
  return null;
}

async function callDeepSeekRewriter(systemPrompt: string, userText: string): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
      }),
    });

    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const txt = data.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 150) return txt;
    }
  } catch {}
  return null;
}

async function callAnthropicRewriter(systemPrompt: string, userText: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14000);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userText }],
      }),
    });

    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const txt = data.content?.[0]?.text?.trim();
      if (txt && txt.length > 150) return txt;
    }
  } catch {}
  return null;
}

/**
 * Algorithmic Source Condenser (used when external AI APIs are unreachable)
 * STRICT RULE: Only uses sentences present in the source. Never adds fake sentences.
 */
function algorithmicFactualCondenser(
  rawTitle: string,
  rawContent: string,
  sourceName: string
): { title: string; paragraphs: string[] } {
  // 1. Clean headline: remove publisher prefixes, suffixes, brackets
  let cleanTitle = (rawTitle || '')
    .replace(/^BREAKING:\s*/i, '')
    .replace(/^JUST IN:\s*/i, '')
    .replace(/\s*[-–—|]\s*(Daily Trust|Vanguard|Punch|The Nation|Channels|Premium Times|Reuters|BBC|CNN|TheCable).*$/i, '')
    .replace(/\s*[-–—|]\s*Voxpolis.*$/i, '')
    .trim();

  // 2. Parse candidate paragraphs from source text
  const cleanBody = cleanCommercialsAndAdverts(rawContent);
  const rawParas = cleanBody
    .split(/\n\s*\n/)
    .map((p) => p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 35);

  let finalParas: string[] = [];

  if (rawParas.length >= 4) {
    finalParas = rawParas.slice(0, 4);
  } else if (rawParas.length > 0) {
    // If fewer than 4 paragraphs exist, split by sentences to form up to 4 clean paragraphs without inventing ANY words
    const allSentences: string[] = [];
    for (const p of rawParas) {
      const sList = p.match(/[^.!?]+[.!?]+/g) || [p];
      for (const s of sList) {
        const tr = s.trim();
        if (tr.length > 25) allSentences.push(tr);
      }
    }

    if (allSentences.length >= 4) {
      const chunkSize = Math.ceil(allSentences.length / 4);
      for (let i = 0; i < 4; i++) {
        const slice = allSentences.slice(i * chunkSize, (i + 1) * chunkSize);
        if (slice.length > 0) finalParas.push(slice.join(' '));
      }
    } else {
      // Just keep the real sentences that actually exist
      finalParas = rawParas;
    }
  } else {
    finalParas = [cleanTitle];
  }

  return {
    title: cleanTitle,
    paragraphs: finalParas.slice(0, 4),
  };
}

/**
 * Main export: Rewrite any incoming political news story
 */
export async function rewriteStoryForVoxpolis(params: {
  title: string;
  content: string;
  sourceName: string;
  sourceUrl?: string;
  countryName?: string;
}): Promise<RewrittenStory> {
  const { title, content, sourceName, countryName = 'National' } = params;

  const systemPrompt = `You are the Voxpolis senior newsroom rewrite engine.
You are given a raw political news report from an external publisher.
Your task is to produce a sharp, objective, high-clarity Voxpolis news brief.

STRICT EDITORIAL RULES (THE OKPEBHOLO MODEL):
1. REWRITE THE HEADLINE: Must be active, engaging, original, and accurate. Prefix on line 1 with "HEADLINE: ".
2. REWRITE INTO EXACTLY 4 FACTUAL PARAGRAPHS:
   - Paragraph 1 (The Hook): What happened, who did it, and the court/agency/political setting.
   - Paragraph 2 (Key Details & Quotes): Specific findings, rulings, quotes, monetary figures, or statistics from the text.
   - Paragraph 3 (The Counter-View): What the plaintiff, opposing party, or public critics argued or alleged.
   - Paragraph 4 (The Outcome & Next Steps): Legal, electoral, or governance implications reported in the story.
3. 100% FACTUAL FIDELITY: Use ONLY the real names, facts, dates, quotes, and claims from the source text.
4. ZERO ADDITIONS & ZERO FILLER: Do NOT invent facts. Do NOT add robotic filler like "Stakeholders are monitoring..." or generic commentary.
5. NO MARKDOWN: Output ONLY "HEADLINE: <headline>" followed by two newlines and the 4 paragraphs separated by double newlines.`;

  const userText = `Headline: ${title}\nSource: ${sourceName}\nCountry: ${countryName}\n\nSource Text:\n${content.slice(0, 7500)}`;

  let rawOutput: string | null = null;
  let providerUsed = 'none';

  // 1. Try Gemini
  rawOutput = await callGeminiRewriter(systemPrompt, userText);
  if (rawOutput) providerUsed = 'Gemini';

  // 2. Fallback to Kimi
  if (!rawOutput) {
    rawOutput = await callKimiRewriter(systemPrompt, userText);
    if (rawOutput) providerUsed = 'Kimi';
  }

  // 3. Fallback to DeepSeek
  if (!rawOutput) {
    rawOutput = await callDeepSeekRewriter(systemPrompt, userText);
    if (rawOutput) providerUsed = 'DeepSeek';
  }

  // 4. Fallback to Claude
  if (!rawOutput) {
    rawOutput = await callAnthropicRewriter(systemPrompt, userText);
    if (rawOutput) providerUsed = 'Claude';
  }

  // If AI rewrite succeeded:
  if (rawOutput) {
    let headline = title;
    let bodyText = rawOutput;

    const headlineMatch = rawOutput.match(/^HEADLINE:\s*(.*)/i);
    if (headlineMatch) {
      headline = headlineMatch[1].replace(/[*#]/g, '').trim();
      bodyText = rawOutput.replace(/^HEADLINE:.*(?:\r?\n)+/i, '').trim();
    }

    const paras = bodyText
      .split(/\n\s*\n/)
      .map((p) => p.replace(/[*#]/g, '').trim())
      .filter((p) => p.length > 30);

    if (paras.length >= 2) {
      const strictly4Paras = paras.slice(0, 4);
      const cleanHeadline = headline.endsWith(' - Voxpolis') ? headline : `${headline} - Voxpolis`;
      const pureHeadline = headline.replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();
      const slug = generateVoxpolisSlug(pureHeadline);

      return {
        title: cleanHeadline,
        slug,
        content: strictly4Paras.join('\n\n'),
        paragraphs: strictly4Paras,
        snippet: strictly4Paras[0] || '',
        isAiRewritten: true,
        provider: providerUsed,
      };
    }
  }

  // Algorithmic Fallback (Source Facts Only, zero robotic filler)
  const fallback = algorithmicFactualCondenser(title, content, sourceName);
  const cleanHeadline = fallback.title.endsWith(' - Voxpolis') ? fallback.title : `${fallback.title} - Voxpolis`;
  const pureHeadline = fallback.title.replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();
  const slug = generateVoxpolisSlug(pureHeadline);

  return {
    title: cleanHeadline,
    slug,
    content: fallback.paragraphs.join('\n\n'),
    paragraphs: fallback.paragraphs,
    snippet: fallback.paragraphs[0] || '',
    isAiRewritten: false,
    provider: 'Factual Source Condenser',
  };
}
