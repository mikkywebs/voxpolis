import { getCountryByCode } from '@/config/countries';
import { ArticleData } from './news';

export interface RssFeedConfig {
  name: string;
  url: string;
}

// Map of dedicated national political RSS feeds per country
const COUNTRY_RSS_MAP: Record<string, RssFeedConfig[]> = {
  NG: [
    { name: 'DailyPost Nigeria', url: 'https://dailypost.ng/category/politics/feed/' },
    { name: 'Vanguard Nigeria', url: 'https://www.vanguardngr.com/category/politics/feed/' },
    { name: 'Premium Times Nigeria', url: 'https://www.premiumtimesng.com/category/news/top-news/feed' },
    { name: 'Punch Nigeria', url: 'https://punchng.com/topics/politics/feed/' },
  ],
  US: [
    { name: 'Politico', url: 'https://rss.politico.com/politics-news.xml' },
    { name: 'NPR Politics', url: 'https://feeds.npr.org/1014/rss.xml' },
  ],
  GB: [
    { name: 'BBC Politics', url: 'http://feeds.bbci.co.uk/news/politics/rss.xml' },
    { name: 'The Guardian UK', url: 'https://www.theguardian.com/politics/rss' },
  ],
  GH: [
    { name: 'GhanaWeb Politics', url: 'https://www.ghanaweb.com/GhanaHomePage/rss/feed.php?cat=politics' },
  ],
  ZA: [
    { name: 'Daily Maverick SA', url: 'https://www.dailymaverick.co.za/section/south-africa/feed/' },
  ],
  KE: [
    { name: 'Capital FM Kenya', url: 'https://www.capitalfm.co.ke/news/category/kenya/politics/feed/' },
  ],
  CA: [
    { name: 'CBC News Politics', url: 'https://www.cbc.ca/cxml/rss/rss-politics.xml' },
  ],
  AU: [
    { name: 'ABC News Australia', url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
  ],
  IN: [
    { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvnews-india-news' },
  ],
};

const REAL_POLITICAL_PHOTOS = [
  'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1575320181282-9afab399332c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=80',
];

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&#8216;|&#8217;|&#8218;|&#8219;|&#145;|&#146;/g, "'")
    .replace(/&#8211;|&#8212;/g, '–')
    .replace(/&#8220;|&#8221;|&#8222;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '');
}

function cleanRssText(raw: string): string {
  if (!raw) return '';
  // Double decode to handle encoded HTML tags like &lt;a href="..."&gt;
  let text = decodeHtmlEntities(decodeHtmlEntities(raw));
  text = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/http[s]?:\/\/[^\s]+/g, '')
    .replace(/href=["'][^"']*["']/g, '')
    .replace(/ONLY AVAILABLE IN PAID PLANS/gi, '')
    .replace(/The post .* appeared first on .*/gi, '')
    .replace(/appeared first on .*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < 5 || text.startsWith('<a') || text.includes('news.google.com')) {
    return '';
  }
  return text;
}

function generateSlug(title: string, idSuffix: string | number): string {
  const clean = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${clean.slice(0, 80)}-${idSuffix}`;
}

export async function fetchRssArticlesForCountry(
  countryCode: string,
  language: string = 'en'
): Promise<ArticleData[]> {
  const code = countryCode.toUpperCase();
  const country = getCountryByCode(code);

  // Build full list of RSS feeds for this country
  const explicitFeeds = COUNTRY_RSS_MAP[code] || [];
  
  // Always append Google News RSS for prompt regional coverage
  const googleNewsUrl = `https://news.google.com/rss/search?q=politics+${encodeURIComponent(country.name)}&hl=en-${code}&gl=${code}&ceid=${code}:en`;
  
  const targetFeeds: RssFeedConfig[] = [
    ...explicitFeeds,
    { name: `${country.name} Political News`, url: googleNewsUrl },
  ];

  const fetchedResults: ArticleData[] = [];

  const feedPromises = targetFeeds.map(async (feed) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(feed.url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        next: { revalidate: 900 },
      });

      clearTimeout(timeoutId);

      if (!res.ok) return [];

      const xmlText = await res.text();
      return parseRssXmlToArticles(xmlText, feed.name, code, country.name);
    } catch {
      return [];
    }
  });

  const results = await Promise.allSettled(feedPromises);

  results.forEach((res) => {
    if (res.status === 'fulfilled' && res.value) {
      fetchedResults.push(...res.value);
    }
  });

  // Deduplicate articles by title/slug
  const seenTitles = new Set<string>();
  const uniqueArticles: ArticleData[] = [];

  for (const art of fetchedResults) {
    const titleKey = art.title.toLowerCase().slice(0, 40);
    if (!seenTitles.has(titleKey)) {
      seenTitles.add(titleKey);
      uniqueArticles.push(art);
    }
  }

  // Sort all articles (active and archived) by created_at descending
  return uniqueArticles.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function parseRssXmlToArticles(
  xmlString: string,
  defaultSource: string,
  countryCode: string,
  countryName: string
): ArticleData[] {
  const articles: ArticleData[] = [];
  const itemMatches = xmlString.match(/<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi) || [];

  itemMatches.forEach((itemXml, idx) => {
    const getTag = (tag: string) => {
      const match = itemXml.match(new RegExp(`<${tag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim() : '';
    };

    const rawTitle = getTag('title');
    let link = getTag('link');
    if (!link) {
      const linkHrefMatch = itemXml.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (linkHrefMatch) link = linkHrefMatch[1];
    }

    let description = getTag('content:encoded') || getTag('description') || getTag('summary');
    const pubDateStr = getTag('pubDate') || getTag('dc:date') || getTag('updated');
    const pubDate = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString();

    const sourceTag = getTag('source');

    let titleText = cleanRssText(rawTitle) || decodeHtmlEntities(decodeHtmlEntities(rawTitle)).replace(/<[^>]+>/g, '').trim();

    // Parse Google News "Headline - Outlet Name" format
    let sourceName = decodeHtmlEntities(sourceTag) || defaultSource;
    if (titleText.includes(' - ')) {
      const parts = titleText.split(' - ');
      if (parts.length >= 2) {
        const candidateSource = parts[parts.length - 1].trim();
        if (candidateSource.length > 2 && candidateSource.length < 35 && !candidateSource.includes('http')) {
          sourceName = candidateSource;
          titleText = parts.slice(0, parts.length - 1).join(' - ').trim();
        }
      }
    }

    if (!titleText || titleText.length < 10 || titleText.includes('<a href')) return;

    // Enhanced real photograph extraction
    let imageUrl: string | undefined = undefined;
    const enclosureMatch = itemXml.match(/<(?:enclosure|media:content)[^>]+url=["']([^"']+)["']/i);
    if (enclosureMatch && enclosureMatch[1].match(/https?:\/\//i)) {
      imageUrl = enclosureMatch[1];
    } else {
      const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1].match(/^https?:\/\//i)) {
        imageUrl = imgMatch[1];
      }
    }

    // Breaking news banner fallback if direct image is missing
    if (!imageUrl) {
      imageUrl = '/breaking-news-banner.png';
    }

    // Clean text snippet
    let cleanSnippet = cleanRssText(description);
    if (!cleanSnippet || cleanSnippet.length < 15 || cleanSnippet.includes('<a href')) {
      cleanSnippet = `${titleText}. Official administrative reporting and governance update for ${countryName}.`;
    } else {
      cleanSnippet = cleanSnippet.slice(0, 280);
    }

    const articleId = `rss-${countryCode.toLowerCase()}-${Date.now()}-${idx}`;
    const slug = generateSlug(titleText, idx);

    articles.push({
      id: articleId,
      slug,
      title: titleText,
      snippet: cleanSnippet,
      content: `${cleanSnippet}\n\nFull administrative reporting and continuous legislative updates are documented directly in official press archives.`,
      ai_analysis: `• Core Fact: ${cleanSnippet}\n• Legislative Scope: Policy directives and structural governance protocols were introduced for public review.\n• Impact Summary: Measures undergo committee evaluation with multi-party oversight.`,
      country_code: countryCode,
      language: 'en',
      category: 'politics',
      image_mode: 'original',
      original_image_url: imageUrl,
      source_name: sourceName,
      source_url: link || 'https://voxpolis.app',
      is_breaking: idx === 0,
      tags: ['Politics', countryName, sourceName],
      views_count: 0,
      total_reading_time_seconds: 180,
      created_at: pubDate,
      poll: {
        id: `poll-${articleId}`,
        question: `What is your perspective on the decision regarding "${titleText.slice(0, 75)}"?`,
        agree_count: 0,
        disagree_count: 0,
      },
    });
  });

  return articles;
}
