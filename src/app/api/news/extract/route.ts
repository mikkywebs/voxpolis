import { NextRequest, NextResponse } from 'next/server';
import { synthesize4ParagraphBrief } from '@/lib/news';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;

  const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];
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

async function callAnthropic(systemPrompt: string, userText: string): Promise<string | null> {
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
    } else {
      const errTxt = await res.text();
      console.warn('[VoxPolis AI] Anthropic HTTP', res.status, errTxt.slice(0, 300));
    }
  } catch (err: any) {
    console.warn('[VoxPolis AI] Anthropic call error:', err?.message || err);
  }
  return null;
}

async function rewriteWithMultiAiEngine(
  paragraphs: string[],
  sourceUrl: string,
  headline: string,
  sourceName: string
): Promise<{ content: string; paragraphs: string[]; headline?: string; providerUsed: string } | null> {
  const systemPrompt = `You are the Voxpolis senior newsroom rewrite engine. You are provided with the raw extracted text of a verified political news report. Your task is to produce a sharp, engaging, reader-friendly Voxpolis news brief.

STRICT EDITORIAL RULES (THE OKPEBHOLO MODEL):
1. REWRITE THE HEADLINE: Produce an active, punchy, engaging headline on the first line prefixed with "HEADLINE: " (e.g., "HEADLINE: Nigerians Slam Okpebholo Over ₦3,000 UK Fuel Comparison").
2. PRODUCE EXACTLY 4 CONCISE, FACTUAL PARAGRAPHS:
   - Paragraph 1 (The Hook): State who did what, the central event, and the immediate reaction/backlash.
   - Paragraph 2 (The Key Figures & Quotes): Detail the specific claims, statistics, monetary figures, or direct statements.
   - Paragraph 3 (The Counter-View): Summarize the criticisms, opposition statements, or public counter-arguments.
   - Paragraph 4 (The Political Fallout): Note any calls for resignation, party statements, or legislative next steps.
3. PRESERVE 100% OF REAL FACTS: Keep all real names, titles, parties, dates, and numbers accurate. Never invent facts or hallucinate.
4. NO WIRE FILLER: Eliminate wire repetitiveness, generic introductory padding, or clichéd robotic lines.
5. NO MARKDOWN: Output only the "HEADLINE: ..." line followed by two line breaks, and then the 4 paragraphs separated by double line breaks.`;

  const userText = `Headline: ${headline}\nPublisher: ${sourceName}\nURL: ${sourceUrl}\n\nRaw Source Text:\n${paragraphs.join('\n\n').slice(0, 8500)}`;

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

  // 4. Fallback to Anthropic Claude (e.g. from local .env.local)
  if (!rawOutput) {
    rawOutput = await callAnthropic(systemPrompt, userText);
    if (rawOutput) providerUsed = 'Claude';
  }

  // 5. Ultimate Newsroom Fallback: Algorithmic 4-Paragraph Synthesizer (never dump raw wire or commercials)
  if (!rawOutput) {
    const fallbackContent = synthesize4ParagraphBrief(headline, '', paragraphs, sourceName, 'National');
    const fallbackParas = fallbackContent.split(/\n\s*\n/).filter((p) => p.length > 25);
    return {
      content: fallbackContent,
      paragraphs: fallbackParas,
      headline,
      providerUsed: 'Algorithmic Engine',
    };
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
    return {
      content: paras.join('\n\n'),
      paragraphs: paras,
      headline: rewrittenHeadline,
      providerUsed,
    };
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceUrl = searchParams.get('url');

  if (!sourceUrl || !sourceUrl.startsWith('http')) {
    return NextResponse.json({ success: false, error: 'Valid source URL required' }, { status: 400 });
  }

  try {
    const parsed = new URL(sourceUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ success: false, error: 'Invalid protocol' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed URL' }, { status: 400 });
  }

  let sourceHost = 'News Wire';
  try {
    const u = new URL(sourceUrl);
    sourceHost = u.hostname.replace(/^www\./, '');
  } catch {}

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

    const res = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({ success: false, status: res.status, requiresReview: true, sourceUrl, sourceName: detectedSource });
    }

    let html = await res.text();

    // Check for DDoS-Guard / SlowAES anti-bot challenge (e.g. Premium Times)
    if (html.includes('/aes.js') || html.includes('slowAES')) {
      try {
        const parsedUrl = new URL(sourceUrl);
        const aesRes = await fetch(`${parsedUrl.origin}/aes.js`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (aesRes.ok) {
          const aesCode = await aesRes.text();
          const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
          if (scriptMatch) {
            let setCookie = '';
            let targetHref = '';
            const vmModule = await import('vm');
            const sandbox = {
              document: {
                get cookie() {
                  return setCookie;
                },
                set cookie(val: string) {
                  setCookie = val;
                },
              },
              location: {
                set href(val: string) {
                  targetHref = val;
                },
              },
            };
            vmModule.createContext(sandbox);
            vmModule.runInContext(aesCode, sandbox);
            vmModule.runInContext(scriptMatch[1], sandbox);

            if (targetHref && setCookie) {
              const res2 = await fetch(targetHref, {
                headers: {
                  Cookie: setCookie.split(';')[0],
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
              });
              if (res2.ok) {
                html = await res2.text();
              }
            }
          }
        }
      } catch {
        // Silently continue with original html if challenge solver fails
      }
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
      return NextResponse.json({
        success: true,
        isColumnist: true,
        author: extractedAuthor || 'Guest Columnist',
        sourceName: detectedSource,
        sourceUrl,
        headline: extractedHeadline,
        message: 'This article is a columnist contribution or op-ed. Columnist articles are reserved for direct publisher reading.',
      });
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
        return NextResponse.json({
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
        });
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

      return NextResponse.json({
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
      });
    }

    const fallbackResult = synthesize4ParagraphBrief(
      extractedHeadline || 'Political Dispatch',
      '',
      [],
      detectedSource,
      'National'
    );
    return NextResponse.json({
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
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      requiresReview: true,
      error: err.message || 'Extract failed',
      sourceName: detectedSource,
      sourceUrl,
    });
  }
}
