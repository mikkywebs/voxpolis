import { SourceFeed } from '@/config/coverage';

export interface FeedItem {
  title: string;
  url: string;
  description: string;
  publishedAt: string;
  sourceName: string;
  feedUrl: string;
}

export interface FeedReadResult {
  items: FeedItem[];
  errors: { feed: string; error: string }[];
}

function cdata(s: string) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function text(s: string) {
  return cdata(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;|&#8217;|&#8216;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? m[1] : '';
}

function parseFeed(xml: string, feed: SourceFeed): FeedItem[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  const out: FeedItem[] = [];
  for (const b of blocks) {
    const title = text(tag(b, 'title'));
    let link = cdata(tag(b, 'link'));
    if (!link) link = b.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || '';
    if (!link || !/^https?:\/\//.test(link)) link = cdata(tag(b, 'guid'));
    const dateRaw = text(tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated'));
    const d = dateRaw ? new Date(dateRaw) : null;
    if (!title || !/^https?:\/\//.test(link)) continue;
    out.push({
      title,
      url: link.trim(),
      description: text(tag(b, 'description') || tag(b, 'summary')).slice(0, 500),
      publishedAt: d && !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString(),
      sourceName: feed.name,
      feedUrl: feed.url,
    });
  }
  return out;
}

export async function readFeeds(feeds: SourceFeed[]): Promise<FeedReadResult> {
  const errors: { feed: string; error: string }[] = [];
  const results = await Promise.all(
    feeds.map(async (feed) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(feed.url, {
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; VoxpolisBot/2.0; +https://voxpolis.app/about)',
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          },
        });
        if (!res.ok) {
          errors.push({ feed: feed.name, error: `HTTP ${res.status}` });
          return [];
        }
        const items = parseFeed(await res.text(), feed);
        if (items.length === 0) errors.push({ feed: feed.name, error: 'no items parsed' });
        return items;
      } catch (e: any) {
        errors.push({ feed: feed.name, error: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e) });
        return [];
      } finally {
        clearTimeout(timer);
      }
    })
  );
  return { items: results.flat(), errors };
}

/** Cheap pre-filter so we don't spend AI calls on sport, celebrity or weather. */
const POLITICAL =
  /\b(president|prime minister|minister|ministry|government|governor|senat|congress|parliament|assembly|lawmaker|legislat|bill|policy|election|electoral|vote|voter|poll|campaign|party|opposition|coalition|cabinet|tribunal|supreme court|court|judge|ruling|constitution|referendum|tax|budget|sanction|treaty|diplomat|summit|white house|downing street|mp\b|mps\b|council|mayor|impeach|protest|reform|tinubu|apc|pdp|labour|inec|anc|ndc|npp|ruto|trump|starmer|modi|carney|albanese)\b/i;

const NOT_POLITICAL =
  /\b(football|premier league|match|goal|transfer window|nollywood|album|celebrity|recipe|horoscope|weather forecast|box office|fashion|bbnaija|big brother)\b/i;

export function looksPolitical(item: FeedItem): boolean {
  const hay = `${item.title} ${item.description}`;
  if (NOT_POLITICAL.test(hay) && !POLITICAL.test(item.title)) return false;
  if (/politic/i.test(item.feedUrl)) return true; // politics-section feed
  return POLITICAL.test(hay);
}

/** Normalised word set for "same story" detection across outlets. */
export function titleTokens(title: string): Set<string> {
  const stop = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'as', 'at', 'by', 'with', 'from', 'is', 'are', 'was', 'be', 'after', 'over', 'says', 'said', 'new']);
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stop.has(w))
  );
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((w) => {
    if (b.has(w)) inter++;
  });
  return inter / Math.min(a.size, b.size);
}
