import { validateSafePublicUrl } from '@/lib/pipeline/extractor';

/**
 * Reads a publisher article page and pulls out the story text.
 * Order of preference: JSON-LD articleBody → <article> paragraphs → all paragraphs.
 * Follows up to 4 redirects, re-checking every hop against private/internal hosts.
 * A photo is optional; paywalls are detected from structured data, not page code.
 */

export interface ExtractedSource {
  ok: boolean;
  reason?: string;
  finalUrl: string;
  title: string;
  text: string;
  wordCount: number;
  imageUrl?: string;
  author?: string;
  publishedAt?: string;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function meta(html: string, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`, 'i');
    const m = html.match(re1) || html.match(re2);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return undefined;
}

const BOILERPLATE =
  /^(read also|also read|read more|related:|recommended|advertisement|sign up|subscribe|follow us|join our|download our|share this|click here|copyright|all rights reserved|©|photo:|image:|credit:|watch:|listen:|this story was|we use cookies)/i;

function cleanParagraphs(paras: string[]): string[] {
  const seen = new Set<string>();
  return paras
    .map((p) => stripTags(p))
    .filter((p) => p.length >= 40 && !BOILERPLATE.test(p) && !/https?:\/\//.test(p.slice(0, 30)))
    .filter((p) => {
      const k = p.slice(0, 80).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

function fromJsonLd(html: string): { body?: string; free?: boolean; image?: string; author?: string; published?: string } {
  const out: { body?: string; free?: boolean; image?: string; author?: string; published?: string } = {};
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    const json = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    let data: any;
    try {
      data = JSON.parse(json);
    } catch {
      continue;
    }
    const nodes: any[] = Array.isArray(data) ? data : data?.['@graph'] ? data['@graph'] : [data];
    for (const n of nodes) {
      const type = ([] as any[]).concat(n?.['@type'] || []).join(' ');
      if (!/Article|NewsArticle|Report|BlogPosting/i.test(type)) continue;
      if (typeof n.articleBody === 'string' && n.articleBody.length > (out.body?.length || 0)) out.body = n.articleBody;
      if (n.isAccessibleForFree === false || n.isAccessibleForFree === 'False') out.free = false;
      const img = Array.isArray(n.image) ? n.image[0] : n.image;
      if (!out.image) out.image = typeof img === 'string' ? img : img?.url;
      const au = Array.isArray(n.author) ? n.author[0] : n.author;
      if (!out.author && au) out.author = typeof au === 'string' ? au : au?.name;
      if (!out.published && n.datePublished) out.published = n.datePublished;
    }
  }
  return out;
}

async function fetchFollowingSafeRedirects(url: string): Promise<{ res?: Response; finalUrl: string; reason?: string }> {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const check = await validateSafePublicUrl(current);
    if (!check.valid || !check.parsed) return { finalUrl: current, reason: check.reason || 'Unsafe URL' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(check.parsed.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en' },
        cache: 'no-store',
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return { finalUrl: current, reason: `Redirect ${res.status} without location` };
      current = new URL(loc, current).toString();
      continue;
    }
    return { res, finalUrl: current };
  }
  return { finalUrl: current, reason: 'Too many redirects' };
}

export async function extractSourceArticle(url: string, fallbackTitle = ''): Promise<ExtractedSource> {
  const empty = (reason: string, finalUrl = url): ExtractedSource => ({
    ok: false,
    reason,
    finalUrl,
    title: fallbackTitle,
    text: '',
    wordCount: 0,
  });

  try {
    const { res, finalUrl, reason } = await fetchFollowingSafeRedirects(url);
    if (!res) return empty(reason || 'Fetch failed', finalUrl);
    if (!res.ok) return empty(`HTTP ${res.status}`, finalUrl);

    const html = await res.text();
    const ld = fromJsonLd(html);
    if (ld.free === false) return empty('Paywalled (isAccessibleForFree=false)', finalUrl);

    const title = stripTags(meta(html, 'og:title', 'twitter:title') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? fallbackTitle));

    let paragraphs: string[] = [];
    if (ld.body && ld.body.split(/\s+/).length > 150) {
      paragraphs = cleanParagraphs(ld.body.split(/\n+/));
      if (paragraphs.length < 3) paragraphs = [stripTags(ld.body)];
    }

    if (paragraphs.join(' ').split(/\s+/).length < 150) {
      const body = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<(nav|header|footer|aside|form|figure|figcaption|noscript)[\s\S]*?<\/\1>/gi, ' ');
      const article = body.match(/<article[\s\S]*?<\/article>/gi)?.sort((a, b) => b.length - a.length)[0];
      const scope = article && article.length > 2000 ? article : body;
      paragraphs = cleanParagraphs(scope.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []);
    }

    const text = paragraphs.join('\n\n').slice(0, 14_000);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount < 150) return empty(`Too little readable text (${wordCount} words)`, finalUrl);

    const image = meta(html, 'og:image', 'og:image:url', 'twitter:image') || ld.image;
    return {
      ok: true,
      finalUrl,
      title,
      text,
      wordCount,
      imageUrl: image && /^https:\/\//.test(image) ? image : undefined,
      author: meta(html, 'author', 'article:author') || ld.author,
      publishedAt: meta(html, 'article:published_time', 'og:published_time') || ld.published,
    };
  } catch (e: any) {
    return empty(`Extractor error: ${e?.message || e}`);
  }
}
