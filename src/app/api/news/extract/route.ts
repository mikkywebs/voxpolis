import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

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
      return NextResponse.json({ success: false, status: res.status });
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
                location: {
                  set href(val: string) {
                    targetHref = val;
                  },
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
      } catch (bypassErr) {
        // Silently continue with original html if challenge solver fails
      }
    }

    // 1. Locate the core article content container
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
      const fullText = cleanedParas.join('\n\n');
      return NextResponse.json({
        success: true,
        content: fullText,
        paragraphs: cleanedParas,
        wordCount: fullText.split(/\s+/).length,
      });
    }

    return NextResponse.json({ success: false, reason: 'Insufficient paragraphs extracted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Extract failed' });
  }
}
