import { ScrapedSourcePage } from './types';

export function isValidContentImage(url?: string): boolean {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return false;

  const lower = url.toLowerCase();

  // Reject tracking pixels, placeholders, site icons, and explicit logo directories
  const REJECT_PATTERNS = [
    'default-logo',
    'site-logo',
    'brand-logo',
    'header-logo',
    'footer-logo',
    'punch-logo',
    'rss-logo',
    'wp-content/uploads/logo',
    'favicon',
    'placeholder',
    'avatar',
    'wordpress/assets',
    'icon-192',
    'icon-512',
    'apple-touch-icon',
    'default_news',
    'no-image',
    'no_image',
    '1x1.',
    'pixel.gif',
    'blank.gif',
  ];

  if (REJECT_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return false;
  }

  // Reject explicit standalone logo files (e.g. /logo.png, _logo.jpg, -logo.svg)
  // without falsely rejecting genuine words like dialogue, catalog, technology, or CDN image paths
  if (/(?:^|[\/_\.-])logo(?:[\/_\.-]|\.(?:png|jpg|jpeg|svg|webp|gif))/i.test(lower)) {
    return false;
  }

  return true;
}

function cleanHtmlTags(html: string): string {
  if (!html) return '';

  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(div|section|aside|ul|ol)[^>]*?(class|id)=["'][^"']*(?:comment|share|social|related|sidebar|advert|widget|nav|menu|footer|banner|promo)[^"']*["'][\s\S]*?<\/\1>/gi, ' ');

  const blockMatches = clean.match(/<(?:p|h[1-6]|li|blockquote)[^>]*>([\s\S]*?)<\/(?:p|h[1-6]|li|blockquote)>/gi);

  let textContent = '';
  if (blockMatches && blockMatches.length > 0) {
    textContent = blockMatches
      .map((block) =>
        block
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
      .filter((t) => t.length > 25 && !t.match(/^(share|tweet|facebook|whatsapp|copy link|follow us|copyright|all rights reserved|read also|advertisement)/i))
      .join('\n\n');
  } else {
    textContent = clean
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return textContent;
}

function extractOgImage(html: string): string | undefined {
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return match ? match[1] : undefined;
}

function extractTitle(html: string, fallbackTitle: string): string {
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitleMatch && ogTitleMatch[1].trim().length > 10) {
    return ogTitleMatch[1].trim();
  }

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const cleanH1 = h1Match[1].replace(/<[^>]+>/g, '').trim();
    if (cleanH1.length > 10) return cleanH1;
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const cleanTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    if (cleanTitle.length > 10) return cleanTitle;
  }

  return fallbackTitle;
}

export async function fetchAndExtractSourcePage(
  sourceUrl: string,
  sourceName: string = 'Press Outlet',
  rssHeadline: string = '',
  rssDescription: string = '',
  rssDate?: string
): Promise<ScrapedSourcePage> {
  const publishedAt = rssDate || new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VoxpolisBot/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        source_url: sourceUrl,
        source_name: sourceName,
        source_published_at: publishedAt,
        source_headline: rssHeadline,
        extracted_full_text: '',
        character_count: 0,
        word_count: 0,
        is_valid: false,
        reject_reason: `HTTP Fetch Failed with status ${res.status}`,
      };
    }

    const html = await res.text();

    const paywallMarkers = ['paywall', 'subscriber only', 'subscribe to read', 'register to read full story', 'membership required'];
    const lowerHtml = html.toLowerCase();
    if (paywallMarkers.some((marker) => lowerHtml.includes(marker))) {
      return {
        source_url: sourceUrl,
        source_name: sourceName,
        source_published_at: publishedAt,
        source_headline: rssHeadline,
        extracted_full_text: '',
        character_count: 0,
        word_count: 0,
        is_valid: false,
        reject_reason: 'Source page protected by paywall / subscriber wall',
      };
    }

    const headline = extractTitle(html, rssHeadline);
    const imageUrl = extractOgImage(html);
    const fullText = cleanHtmlTags(html);
    const charCount = fullText.length;
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    // Reject Gate Rule: Must have a clear, real content photograph (not a publisher logo like punchng.com)
    if (!isValidContentImage(imageUrl)) {
      return {
        source_url: sourceUrl,
        source_name: sourceName,
        source_published_at: publishedAt,
        source_headline: headline,
        extracted_full_text: fullText,
        image_url: undefined,
        character_count: charCount,
        word_count: wordCount,
        is_valid: false,
        reject_reason: 'Source page lacks a clear content image or displays a generic publisher logo (e.g. punchng.com logo)',
      };
    }

    // Reject Gate Rule 1: Extract < 800 characters
    if (charCount < 800) {
      return {
        source_url: sourceUrl,
        source_name: sourceName,
        source_published_at: publishedAt,
        source_headline: headline,
        extracted_full_text: fullText,
        image_url: imageUrl,
        character_count: charCount,
        word_count: wordCount,
        is_valid: false,
        reject_reason: `Extracted text length (${charCount} chars) is under minimum required 800 characters`,
      };
    }

    // Reject Gate Rule 2: Text contains [...] or "read more" / "click here" as ending
    const trimmedText = fullText.trim();
    if (
      trimmedText.endsWith('[...]') ||
      trimmedText.endsWith('…') ||
      trimmedText.match(/(?:read more|click here to read|continue reading)\.?$/i)
    ) {
      return {
        source_url: sourceUrl,
        source_name: sourceName,
        source_published_at: publishedAt,
        source_headline: headline,
        extracted_full_text: fullText,
        image_url: imageUrl,
        character_count: charCount,
        word_count: wordCount,
        is_valid: false,
        reject_reason: 'Extracted text ends in a teaser indicator ([...], read more)',
      };
    }

    // Reject Gate Rule 3: Extract is essentially equal to RSS description
    const cleanRssDesc = rssDescription.replace(/<[^>]+>/g, '').trim();
    if (cleanRssDesc.length > 50 && charCount <= cleanRssDesc.length + 50) {
      return {
        source_url: sourceUrl,
        source_name: sourceName,
        source_published_at: publishedAt,
        source_headline: headline,
        extracted_full_text: fullText,
        image_url: imageUrl,
        character_count: charCount,
        word_count: wordCount,
        is_valid: false,
        reject_reason: 'Extracted text is equal to RSS description teaser',
      };
    }

    return {
      source_url: sourceUrl,
      source_name: sourceName,
      source_published_at: publishedAt,
      source_headline: headline,
      extracted_full_text: fullText,
      image_url: imageUrl,
      character_count: charCount,
      word_count: wordCount,
      is_valid: true,
    };
  } catch (err: any) {
    return {
      source_url: sourceUrl,
      source_name: sourceName,
      source_published_at: publishedAt,
      source_headline: rssHeadline,
      extracted_full_text: '',
      character_count: 0,
      word_count: 0,
      is_valid: false,
      reject_reason: `Scraper exception: ${err.message || String(err)}`,
    };
  }
}
