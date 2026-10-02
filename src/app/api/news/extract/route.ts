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
    const timeoutId = setTimeout(() => controller.abort(), 6000);

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

    const html = await res.text();

    // Remove scripts, styles, nav, headers, footers, comments, and sidebars
    const cleanHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
      .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');

    const pMatches = cleanHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];

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
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter(
        (t) =>
          t.length > 35 &&
          !t.match(
            /^(read also|also read|click here|source:|copyright|all rights reserved|advertisement|follow us|join our|subscribe|download our|share this|tweet|whatsapp|cookie|for advert|contact us)/i
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
