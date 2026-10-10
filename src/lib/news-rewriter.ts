/**
 * VoxPolis Core Newsroom Rewriter & Synthesis Engine
 *
 * Implements the Okpebholo Model:
 * 1. Unique, active, engaging VoxPolis headline.
 * 2. Unique URL slug generated from the VoxPolis headline (never copied from wire).
 * 3. Strictly 2 to 4 factual paragraphs.
 * 4. 100% FACTUAL FIDELITY: Uses ONLY facts, names, figures, and quotes from the original news source.
 * 5. ZERO ADDITIONS: Never invents facts, never hallucinates, and never adds robotic filler.
 * 6. ZERO VERBATIM COPY: Strict 8-consecutive-word overlap blocker.
 * 7. FAIL-CLOSED ARCHITECTURE: Never serves raw or condensed source text if AI fails.
 */

import { findConsecutiveWordOverlaps } from './pipeline/overlap';

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

export function decodeAllHtmlEntities(str: string): string {
  if (!str) return '';
  let res = str;
  // Handle double encoding like &amp;#8216;
  res = res.replace(/&amp;#/gi, '&#').replace(/&amp;/gi, '&');
  res = res.replace(/&#8216;|&#8217;|&#8218;|&#8219;|&#145;|&#146;|&lsquo;|&rsquo;/gi, "'");
  res = res.replace(/&#8220;|&#8221;|&#8222;|&ldquo;|&rdquo;/gi, '"');
  res = res.replace(/&#8211;|&ndash;/gi, '–');
  res = res.replace(/&#8212;|&mdash;/gi, '—');
  res = res.replace(/&#039;|&apos;|&#39;/gi, "'");
  res = res.replace(/&quot;/gi, '"');
  res = res.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
  res = res.replace(/&nbsp;/gi, ' ');
  res = res.replace(/&#(\d+);/g, (m, dec) => String.fromCharCode(dec));
  res = res.replace(/&#x([0-9a-f]+);/gi, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
  return res.replace(/<[^>]+>/g, '').replace(/[^\S\r\n]+/g, ' ').trim();
}

export function cleanCommercialsAndAdverts(text: string): string {
  if (!text) return '';
  const decoded = decodeAllHtmlEntities(text);
  return decoded
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
 * Priority 1: Google Gemini (gemini-flash-latest, gemini-flash-lite-latest, gemini-3.5-flash-lite)
 * Priority 2: Kimi (Moonshot)
 * Priority 3: DeepSeek
 */
async function callGeminiRewriter(systemPrompt: string, userText: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  const models = [
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
  ];

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userText}` }] }],
          generationConfig: { temperature: 0.15, maxOutputTokens: 1200 },
        }),
      });

      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const txt = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (txt && txt.length > 80) return txt;
      } else {
        const err = await res.text();
        console.warn(`[VoxPolis AI] Gemini ${model} HTTP ${res.status}:`, err.slice(0, 200));
      }
    } catch (err: any) {
      console.warn(`[VoxPolis AI] Gemini ${model} exception:`, err?.message || err);
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
        temperature: 0.15,
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
        temperature: 0.15,
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

/**
 * Main export: Rewrite any incoming political news story
 * FAIL-CLOSED: Returns isAiRewritten=false and empty content if AI rewrite fails or has overlap.
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
Rewrite this political news report into an original, concise, and completely factual Voxpolis news brief.

EDITORIAL RULES:
1. LINE 1 MUST BE: HEADLINE: <Your unique, accurate headline in title case reflecting the source story>
2. BODY: PRODUCE 2 TO 4 FACTUAL PARAGRAPHS summarizing the verified report:
   - Paragraph 1: State the core development, key actors or institutions, and the official context.
   - Paragraph 2: Report specific verified details, figures, legislation, or direct statements reported in the text.
   - Subsequent paragraphs (if supported by source): Report official responses, implementation timelines, or next steps explicitly stated in the source.
3. 100% FACTUAL FIDELITY: Every single factual claim must be directly supported by the supplied source text.
4. ZERO FABRICATIONS: Never invent quotations, unnamed "critics", public backlash, protests, allegations, denials, dates, figures, or calls for resignation that are absent from the source.
5. CONDITIONAL OPPOSING VIEWS: Include counter-views or criticism ONLY when the source explicitly reports them. If the source report is a neutral announcement or does not mention opposing views, do NOT invent or assume them.
6. PRESERVE ATTRIBUTION: Clearly distinguish allegations or claims from established facts (e.g. use "alleged", "stated", "according to"), and preserve relevant denials, defenses, or responses present in the text.
7. ACCURATE BREVITY: If the source text lacks enough information for 4 paragraphs, produce a concise 2- or 3-paragraph brief. NEVER add speculative filler or unsupported content to reach a length target.
8. CRITICAL ZERO-COPY RULE: NEVER copy 8 or more consecutive words from the source headline or text. You must completely recast all phrasing into original Voxpolis reporting while strictly preserving 100% of facts, names, figures, and dates.
9. ZERO CONVERSATIONAL FILLER OR MARKDOWN: Do not include introductory remarks, bullet points, or commentary.
10. ZERO HTML ENTITIES: Use clean plain punctuation, never codes like &#8216; or &#8217;.
11. OUTPUT ONLY the "HEADLINE: ..." line followed by two line breaks, and then the paragraphs separated by double line breaks.`;

  const cleanContent = cleanCommercialsAndAdverts(content).slice(0, 7500);
  const userText = `Headline: ${decodeAllHtmlEntities(title)}\nSource: ${sourceName}\nCountry: ${countryName}\n\nSource Text:\n${cleanContent}`;

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

  // If AI rewrite succeeded:
  if (rawOutput) {
    let headline = title;
    let bodyText = rawOutput;

    const headlineMatch = rawOutput.match(/^HEADLINE:\s*(.*)/i);
    if (headlineMatch) {
      headline = headlineMatch[1].replace(/[*#]/g, '').trim();
      bodyText = rawOutput.replace(/^HEADLINE:.*(?:\r?\n)+/i, '').trim();
    }
    headline = decodeAllHtmlEntities(headline);
    bodyText = decodeAllHtmlEntities(bodyText);

    const paras = bodyText
      .split(/\n\s*\n/)
      .map((p) => p.replace(/[*#]/g, '').trim())
      .filter((p) => p.length > 30);

    if (paras.length >= 2) {
      const strictly4Paras = paras.slice(0, 4);
      const candidateContent = strictly4Paras.join('\n\n');

      // STRICT 8-WORD CONSECUTIVE OVERLAP CHECK
      const fullSourceToCheck = `${decodeAllHtmlEntities(title)}\n${cleanContent}`;
      const bodyOverlaps = findConsecutiveWordOverlaps(fullSourceToCheck, candidateContent, 8);
      const headlineOverlaps = findConsecutiveWordOverlaps(decodeAllHtmlEntities(title), headline, 8);

      if (bodyOverlaps.length > 0 || headlineOverlaps.length > 0) {
        console.warn(
          `[VoxPolis AI] Blocked article rewrite due to consecutive 8+ word overlap with source:`,
          bodyOverlaps[0] || headlineOverlaps[0]
        );
        // Fail-closed: do not return copied or overlapping content
        return {
          title: '',
          slug: '',
          content: '',
          paragraphs: [],
          snippet: '',
          isAiRewritten: false,
          provider: 'none',
        };
      }

      const cleanHeadline = headline.endsWith(' - Voxpolis') ? headline : `${headline} - Voxpolis`;
      const pureHeadline = headline.replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();
      const slug = generateVoxpolisSlug(pureHeadline);

      return {
        title: cleanHeadline,
        slug,
        content: candidateContent,
        paragraphs: strictly4Paras,
        snippet: strictly4Paras[0] || '',
        isAiRewritten: true,
        provider: providerUsed,
      };
    }
  }

  // FAIL-CLOSED: Never return raw or condensed source text
  return {
    title: '',
    slug: '',
    content: '',
    paragraphs: [],
    snippet: '',
    isAiRewritten: false,
    provider: 'none',
  };
}
