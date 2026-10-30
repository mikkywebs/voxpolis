import dns from 'dns/promises';
import net from 'net';
import { NextRequest, NextResponse } from 'next/server';
import { synthesize4ParagraphBrief } from '@/lib/news';
import { findConsecutiveWordOverlaps } from '@/lib/pipeline/overlap';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Bounded in-memory cache for extracted/rewritten URLs (30-minute TTL, max 500 entries)
const EXTRACT_CACHE_TTL_MS = 30 * 60 * 1000;
const EXTRACT_CACHE_MAX_ENTRIES = 500;
const extractCache = new Map<string, { expiresAt: number; payload: Record<string, any> }>();

// Per-IP sliding-window rate limiter (max 20 requests per 60 seconds)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const ipRequestLog = new Map<string, number[]>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown-ip';
}

function checkExtractRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestLog.set(ip, timestamps);
    return false;
  }
  timestamps.push(now);
  ipRequestLog.set(ip, timestamps);
  if (ipRequestLog.size > 1000) {
    const firstKey = ipRequestLog.keys().next().value;
    if (firstKey) ipRequestLog.delete(firstKey);
  }
  return true;
}

function isPrivateOrReservedIp(ip: string): boolean {
  const clean = ip.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!clean) return true;

  // Handle IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1)
  if (clean.startsWith('::ffff:')) {
    return isPrivateOrReservedIp(clean.slice(7));
  }

  const version = net.isIP(clean);
  if (version === 4) {
    const parts = clean.split('.').map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return true;
    const [a, b, c] = parts;
    if (a === 0 || a === 10 || a === 127) return true; // Current network, RFC1918 10/8, Loopback 127/8
    if (a === 169 && b === 254) return true; // Link-local & Cloud Metadata 169.254/16
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918 172.16/12
    if (a === 192 && b === 168) return true; // RFC1918 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT / Cloud internal 100.64/10
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF / TEST-NET-1
    if (a === 198 && (b === 18 || b === 19)) return true; // Benchmarking
    if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
    if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
    if (a >= 224) return true; // Multicast & Reserved
    return false;
  }

  if (version === 6) {
    if (clean === '::1' || clean === '::' || clean === '0:0:0:0:0:0:0:1' || clean === '0:0:0:0:0:0:0:0') return true;
    if (/^f[cd][0-9a-f]{2}:/i.test(clean)) return true; // Unique Local fc00::/7
    if (/^fe[89ab][0-9a-f]:/i.test(clean)) return true; // Link-local fe80::/10
    if (/^ff[0-9a-f]{2}:/i.test(clean)) return true; // Multicast ff00::/8
    return false;
  }

  return true;
}

async function validateSafePublicUrl(urlStr: string): Promise<{ valid: boolean; reason?: string; parsed?: URL }> {
  if (!urlStr || typeof urlStr !== 'string' || urlStr.length > 2048) {
    return { valid: false, reason: 'Valid source URL required' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, reason: 'Malformed URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Invalid protocol' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Credentials in URL are not permitted' };
  }

  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { valid: false, reason: 'Non-standard ports are not permitted' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.arpa') ||
    host === 'voxpolis.app' ||
    host.endsWith('.voxpolis.app') ||
    /^\d+$/.test(host) ||
    /^0x/i.test(host)
  ) {
    return { valid: false, reason: 'Restricted or internal host is not permitted' };
  }

  if (net.isIP(host) !== 0) {
    if (isPrivateOrReservedIp(host)) {
      return { valid: false, reason: 'Private or reserved IP addresses are not permitted' };
    }
    return { valid: true, parsed };
  }

  if (!host.includes('.')) {
    return { valid: false, reason: 'Invalid public hostname' };
  }

  // Verify DNS does not resolve to private/loopback/metadata IP ranges
  try {
    const records = await dns.lookup(host, { all: true });
    if (!records || records.length === 0) {
      return { valid: false, reason: 'Unable to resolve hostname' };
    }
    for (const rec of records) {
      if (isPrivateOrReservedIp(rec.address)) {
        return { valid: false, reason: 'Hostname resolves to a restricted network address' };
      }
    }
  } catch {
    return { valid: false, reason: 'Unable to resolve hostname' };
  }

  return { valid: true, parsed };
}

function setCachedExtraction(urlKey: string, payload: Record<string, any>) {
  if (extractCache.size >= EXTRACT_CACHE_MAX_ENTRIES) {
    const oldestKey = extractCache.keys().next().value;
    if (oldestKey) extractCache.delete(oldestKey);
  }
  extractCache.set(urlKey, {
    expiresAt: Date.now() + EXTRACT_CACHE_TTL_MS,
    payload,
  });
}

/**
 * Multi-AI Editorial Rewriter Cascade:
 * Priority 1: Google Gemini (GEMINI_API_KEY)
 * Priority 2: Moonshot Kimi (KIMI_API_KEY)
 * Priority 3: DeepSeek (DEEPSEEK_API_KEY)
 *
 * Implements the "Okpebholo Model":
 * Active punchy title + exactly 4 crisp, objective, factual paragraphs.
 */
async function callGemini(systemPrompt: string, userText: string): Promise<string | null> {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_STUDIO_API_KEY);
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
      } else {
        const errTxt = await res.text();
        console.warn(`[VoxPolis AI] Gemini (${model}) HTTP ${res.status}:`, errTxt.slice(0, 300));
      }
    } catch (err: any) {
      console.warn(`[VoxPolis AI] Gemini (${model}) request error:`, err?.message || err);
    }
  }
  return null;
}

async function callKimi(systemPrompt: string, userText: string): Promise<string | null> {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14000);
    const url = 'https://api.moonshot.cn/v1/chat/completions';

    const res = await fetch(url, {
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
    } else {
      const errTxt = await res.text();
      console.warn(`[VoxPolis AI] Kimi HTTP ${res.status}:`, errTxt.slice(0, 300));
    }
  } catch (err: any) {
    console.warn('[VoxPolis AI] Kimi API call error:', err?.message || err);
  }
  return null;
}

async function callDeepSeek(systemPrompt: string, userText: string): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14000);
    const url = 'https://api.deepseek.com/v1/chat/completions';

    const res = await fetch(url, {
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
    } else {
      const errTxt = await res.text();
      console.warn(`[VoxPolis AI] DeepSeek HTTP ${res.status}:`, errTxt.slice(0, 300));
    }
  } catch (err: any) {
    console.warn('[VoxPolis AI] DeepSeek API call error:', err?.message || err);
  }
  return null;
}

async function rewriteWithMultiAiEngine(
  paragraphs: string[],
  sourceUrl: string,
  headline: string,
  sourceName: string
): Promise<{ content: string; paragraphs: string[]; headline?: string; providerUsed: string } | null> {
  const systemPrompt = `You are the Voxpolis senior newsroom rewrite engine. You are provided with the raw extracted text of a verified political news report. Your task is to produce a sharp, engaging, and strictly factual Voxpolis news brief.

STRICT EDITORIAL RULES:
1. REWRITE THE HEADLINE: Produce an active, engaging headline on the first line prefixed with "HEADLINE: " (e.g., "HEADLINE: Senate Approves New Electoral Reform Bill").
2. PRODUCE 2 TO 4 CONCISE, FACTUAL PARAGRAPHS:
   - Paragraph 1: State the central event, who did what, and the official or institutional setting.
   - Paragraph 2: Detail specific verified findings, statistics, figures, or direct statements from the text.
   - Subsequent Paragraphs (Conditional): Report official responses, next procedural steps, or implementation timelines explicitly mentioned in the source.
3. 100% FACTUAL FIDELITY: Every factual claim must be directly supported by the supplied source text. Keep all real names, titles, parties, dates, and numbers accurate.
4. ZERO FABRICATIONS: Never invent quotations, unnamed "critics", public reactions, backlash, allegations, denials, dates, figures, or calls for resignation that do not exist in the source.
5. CONDITIONAL OPPOSING VIEWS: Include opposing stances, criticisms, or counter-arguments ONLY when the source explicitly reports them. If none are reported, summarize the factual context without inventing conflict.
6. PRESERVE ATTRIBUTION: Clearly distinguish allegations from verified facts (e.g., "alleged", "stated", "according to"), and retain relevant responses or denials reported in the text.
7. ACCURATE BREVITY: If the source lacks enough verified information for 4 paragraphs, produce a shorter 2- or 3-paragraph brief. Never add unsupported content or robotic filler to lengthen the story.
8. CRITICAL ZERO-COPY RULE: NEVER copy 8 or more consecutive words from the headline or source text. Completely recast and rephrase all sentences into your own words.
9. NO WIRE FILLER OR MARKDOWN: Eliminate wire repetitiveness or generic boilerplate. Output ONLY the "HEADLINE: ..." line followed by two line breaks, and then the paragraphs separated by double line breaks.`;

  const cleanSourceText = paragraphs.join('\n\n').slice(0, 8500);
  const userText = `Headline: ${headline}\nPublisher: ${sourceName}\nURL: ${sourceUrl}\n\nRaw Source Text:\n${cleanSourceText}`;

  let rawOutput: string | null = null;
  let providerUsed = 'none';

  // 1. Try Gemini
  rawOutput = await callGemini(systemPrompt, userText);
  if (rawOutput) providerUsed = 'Gemini';

  // 2. Fallback to Kimi
  if (!rawOutput) {
    rawOutput = await callKimi(systemPrompt, userText);
    if (rawOutput) providerUsed = 'Kimi';
  }

  // 3. Fallback to DeepSeek
  if (!rawOutput) {
    rawOutput = await callDeepSeek(systemPrompt, userText);
    if (rawOutput) providerUsed = 'DeepSeek';
  }

  // Fail-closed: Never serve algorithmic fallback or unrewritten text
  if (!rawOutput) {
    return null;
  }

  let rewrittenHeadline: string | undefined = undefined;
  let bodyText = rawOutput;

  const headlineMatch = rawOutput.match(/^HEADLINE:\s*(.*)/i);
  if (headlineMatch) {
    rewrittenHeadline = headlineMatch[1].replace(/[*#]/g, '').trim();
    bodyText = rawOutput.replace(/^HEADLINE:.*(?:\r?\n)+/i, '').trim();
  }

  const paras = bodyText
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[*#]/g, '').trim())
    .filter((p) => p.length > 30);

  if (paras.length >= 2) {
    const candidateContent = paras.join('\n\n');
    const fullSource = `${headline}\n${cleanSourceText}`;

    const bodyOverlaps = findConsecutiveWordOverlaps(fullSource, candidateContent, 8);
    const titleOverlaps = rewrittenHeadline
      ? findConsecutiveWordOverlaps(headline, rewrittenHeadline, 8)
      : [];

    if (bodyOverlaps.length > 0 || titleOverlaps.length > 0) {
      console.warn(
        `[News Extract AI] Blocked article rewrite due to consecutive 8+ word overlap with source:`,
        bodyOverlaps[0] || titleOverlaps[0]
      );
      return null;
    }

    return {
      content: candidateContent,
      paragraphs: paras,
      headline: rewrittenHeadline,
      providerUsed,
    };
  }

  return null;
}

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  if (!checkExtractRateLimit(clientIp)) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please try again shortly.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const sourceUrl = searchParams.get('url')?.trim() || '';

  if (!sourceUrl || !sourceUrl.startsWith('http')) {
    return NextResponse.json({ success: false, error: 'Valid source URL required' }, { status: 400 });
  }

  const urlCheck = await validateSafePublicUrl(sourceUrl);
  if (!urlCheck.valid || !urlCheck.parsed) {
    return NextResponse.json(
      { success: false, error: urlCheck.reason || 'Invalid or restricted URL' },
      { status: 400 }
    );
  }

  const normalizedUrlKey = urlCheck.parsed.toString();
  const cachedEntry = extractCache.get(normalizedUrlKey);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return NextResponse.json({ ...cachedEntry.payload, cached: true });
  }

  const sourceHost = urlCheck.parsed.hostname.toLowerCase().replace(/^www\./, '');

  const sourceNameMap: Record<string, string> = {
    'channelstv.com': 'Channels Television',
    'premiumtimesng.com': 'Premium Times',
    'vanguardngr.com': 'Vanguard News',
    'punchng.com': 'The Punch',
    'thenationonlineng.net': 'The Nation',
    'dailytrust.com': 'Daily Trust',
    'thecable.ng': 'TheCable',
    'thenews-chronicle.com': 'The News Chronicle',
    'dailypost.ng': 'Daily Post',
    'reuters.com': 'Reuters',
    'apnews.com': 'Associated Press',
    'bbc.com': 'BBC News',
    'aljazeera.com': 'Al Jazeera',
    'edition.cnn.com': 'CNN',
    'guardian.ng': 'The Guardian',
    'businessday.ng': 'BusinessDay',
  };

  const detectedSource = sourceNameMap[sourceHost] || sourceHost;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(normalizedUrlKey, {
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    // Handle up to 1 safe public redirect without allowing SSRF redirect to internal IPs
    let finalRes = res;
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const locationHeader = res.headers.get('location');
      if (!locationHeader) {
        return NextResponse.json({ success: false, status: res.status, requiresReview: true, sourceUrl, sourceName: detectedSource });
      }
      const redirectTarget = new URL(locationHeader, normalizedUrlKey).toString();
      const redirectCheck = await validateSafePublicUrl(redirectTarget);
      if (!redirectCheck.valid) {
        return NextResponse.json({ success: false, error: 'Unsafe redirect target blocked' }, { status: 400 });
      }
      const redirectController = new AbortController();
      const redirectTimeout = setTimeout(() => redirectController.abort(), 8000);
      finalRes = await fetch(redirectTarget, {
        signal: redirectController.signal,
        redirect: 'error',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      clearTimeout(redirectTimeout);
    }

    if (!finalRes.ok) {
      return NextResponse.json({ success: false, status: finalRes.status, requiresReview: true, sourceUrl, sourceName: detectedSource });
    }

    const rawText = await finalRes.text();
    const html = rawText.slice(0, 500_000); // Bound HTML size to 500 KB

    // If protected by anti-bot JS challenge (e.g. SlowAES / DDoS-Guard), decline gracefully without executing remote scripts
    if (html.includes('/aes.js') || html.includes('slowAES')) {
      return NextResponse.json({
        success: false,
        requiresReview: true,
        sourceUrl,
        sourceName: detectedSource,
      });
    }

    // 1. Columnist & Opinion Detection: Articles identified as columnist are declined
    const lowerUrl = sourceUrl.toLowerCase();
    const isColumnistUrl =
      lowerUrl.includes('/columns/') ||
      lowerUrl.includes('/column/') ||
      lowerUrl.includes('/opinion/') ||
      lowerUrl.includes('/opinions/') ||
      lowerUrl.includes('/editorial/') ||
      lowerUrl.includes('/editorials/') ||
      lowerUrl.includes('/op-ed/') ||
      lowerUrl.includes('/columnists/') ||
      lowerUrl.includes('/columnist/');

    const lowerHtml = html.toLowerCase();
    const isColumnistHtml =
      lowerHtml.includes('class="tdb-entry-category">columns</a>') ||
      lowerHtml.includes('class="tdb-entry-category">saturday</a>') ||
      lowerHtml.includes('category-columns') ||
      lowerHtml.includes('category-opinion') ||
      lowerHtml.includes('itemprop="articlesection" content="columns"') ||
      lowerHtml.includes('itemprop="articlesection" content="opinion"');

    // Extract Author
    let extractedAuthor = '';
    const authorMetaMatch =
      html.match(/itemprop=["']author["'][^>]*>[\s\S]*?content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/class=["'][^"']*(?:author-name|entry-author|byline|tdb-author-name)[^"']*["'][^>]*>([^<]+)</i);
    if (authorMetaMatch) {
      extractedAuthor = authorMetaMatch[1].replace(/^[—–-]\s*by:\s*/i, '').replace(/^by\s+/i, '').trim();
    }

    // Extract Headline from title tag or h1
    let extractedHeadline = '';
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) {
      extractedHeadline = h1Match[1].replace(/<[^>]+>/g, '').trim();
    }

    if (isColumnistUrl || isColumnistHtml) {
      const columnistPayload = {
        success: true,
        isColumnist: true,
        author: extractedAuthor || 'Guest Columnist',
        sourceName: detectedSource,
        sourceUrl,
        headline: extractedHeadline,
        message: 'This article is a columnist contribution or op-ed. Columnist articles are reserved for direct publisher reading.',
      };
      setCachedExtraction(normalizedUrlKey, columnistPayload);
      return NextResponse.json(columnistPayload);
    }

    // Locate article content container
    let articleHtml = '';
    const contentBlockMatch =
      html.match(/class=["'][^"']*(?:entry-content|post-content|article-content|story-body|article__body|elementor-widget-theme-post-content)[^"']*["'][\s\S]*?(?:<\/article>|<\/main>|<div class=["'](?:comments|footer|related))/i) ||
      html.match(/itemprop=["']articleBody["'][\s\S]*?(?:<\/article>|<\/main>|<div class=["'](?:comments|footer|related))/i) ||
      html.match(/<article[\s\S]*?<\/article>/i) ||
      html.match(/<main[\s\S]*?<\/main>/i);

    if (contentBlockMatch) {
      articleHtml = contentBlockMatch[0];
    } else {
      articleHtml = html;
    }

    // Clean out scripts, styles, iframes, nav, header, footer, comments
    const sanitizedHtml = articleHtml
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');

    const pMatches = sanitizedHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];

    const cleanedParas = pMatches
      .map((p) =>
        p
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'")
          .replace(/&#8216;|&#8217;/gi, "'")
          .replace(/&#8220;|&#8221;/gi, '"')
          .replace(/&#8211;|&#8212;/gi, '—')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(
        (t) =>
          t.length > 40 &&
          !t.match(
            /^(read also|also read|click here|source:|copyright|all rights reserved|advertisement|follow us|join our|subscribe|download our|share this|tweet|whatsapp|cookie|for advert|contact us|sign up|newsletter)/i
          )
      );

    if (cleanedParas.length >= 2) {
      // 2. Perform faithful Multi-AI rewrite (Gemini -> Kimi -> DeepSeek)
      const aiResult = await rewriteWithMultiAiEngine(
        cleanedParas,
        sourceUrl,
        extractedHeadline || 'Political Report',
        detectedSource
      );

      if (aiResult) {
        const genuinelyAi = aiResult.providerUsed !== 'Algorithmic Engine';
        const aiPayload = {
          success: true,
          isColumnist: false,
          isAiRewritten: genuinelyAi,
          headline: aiResult.headline || extractedHeadline,
          content: aiResult.content,
          paragraphs: aiResult.paragraphs,
          wordCount: aiResult.content.split(/\s+/).length,
          provider: aiResult.providerUsed,
          author: extractedAuthor,
          sourceName: detectedSource,
          sourceUrl,
        };
        setCachedExtraction(normalizedUrlKey, aiPayload);
        return NextResponse.json(aiPayload);
      }

      // Fallback: Strictly synthesize a clean 4-paragraph brief with zero commercials
      const synthResult = synthesize4ParagraphBrief(
        extractedHeadline || 'Political Report',
        '',
        cleanedParas,
        detectedSource,
        'National'
      );
      const synthParas = synthResult.split(/\n\s*\n/).filter((p) => p.length > 25);

      const synthPayload = {
        success: true,
        isColumnist: false,
        isAiRewritten: false,
        headline: extractedHeadline,
        content: synthResult,
        paragraphs: synthParas,
        wordCount: synthResult.split(/\s+/).length,
        provider: 'Newsroom Synthesizer',
        author: extractedAuthor,
        sourceName: detectedSource,
        sourceUrl,
      };
      setCachedExtraction(normalizedUrlKey, synthPayload);
      return NextResponse.json(synthPayload);
    }

    const fallbackResult = synthesize4ParagraphBrief(
      extractedHeadline || 'Political Dispatch',
      '',
      [],
      detectedSource,
      'National'
    );
    const fallbackPayload = {
      success: true,
      isColumnist: false,
      isAiRewritten: false,
      headline: extractedHeadline,
      content: fallbackResult,
      paragraphs: fallbackResult.split(/\n\s*\n/),
      wordCount: fallbackResult.split(/\s+/).length,
      provider: 'Newsroom Synthesizer',
      sourceName: detectedSource,
      sourceUrl,
    };
    setCachedExtraction(normalizedUrlKey, fallbackPayload);
    return NextResponse.json(fallbackPayload);
  } catch {
    return NextResponse.json({
      success: false,
      requiresReview: true,
      error: 'Extract failed',
      sourceName: detectedSource,
      sourceUrl,
    });
  }
}
