import { getCountryByCode } from '@/config/countries';
import {
  ArticleData,
  generateAiAnalysisSummary,
  expandToJournalisticArticle,
  synthesize4ParagraphBrief,
  generateCivicPollQuestion,
  formatCleanSnippet,
  isPoliticalNews,
  isRelevantToCountry,
  isColumnistOrOpinion,
} from './news';
import { isValidContentImage } from './pipeline/extractor';

export interface RssFeedConfig {
  name: string;
  url: string;
}

const COUNTRY_RSS_MAP: Record<string, RssFeedConfig[]> = {
  NG: [
    { name: 'DailyPost Nigeria', url: 'https://dailypost.ng/category/politics/feed/' },
    { name: 'Vanguard Nigeria', url: 'https://www.vanguardngr.com/category/politics/feed/' },
    { name: 'Premium Times Nigeria', url: 'https://www.premiumtimesng.com/category/news/politics/feed' },
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
  NZ: [
    { name: 'RNZ Politics', url: 'https://www.rnz.co.nz/rss/political.xml' },
  ],
  IN: [
    { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvnews-india-news' },
  ],
};

export function decodeHtmlEntities(str: string): string {
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
  return res.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function cleanRssText(raw: string): string {
  if (!raw) return '';
  let text = decodeHtmlEntities(decodeHtmlEntities(raw));
  text = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/[^\s)]+/gi, '')
    .replace(/www\.[^\s)]+/gi, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/href=["'][^"']*["']/g, '')
    .replace(/ONLY AVAILABLE IN PAID PLANS/gi, '')
    .replace(/The post .* appeared first on .*/gi, '')
    .replace(/appeared first on .*/gi, '')
    .replace(/(read more on|also read|click here to read|visit our website|source:)[^.\n]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < 5 || text.startsWith('<a')) {
    return '';
  }
  return text;
}

function generateSlug(title: string): string {
  const clean = title
    .toLowerCase()
    .replace(/ - voxpolis$/i, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean.slice(0, 80);
}

export async function fetchRssArticlesForCountry(
  countryCode: string,
  language: string = 'en'
): Promise<ArticleData[]> {
  const code = countryCode.toUpperCase();
  const country = getCountryByCode(code);

  const explicitFeeds = COUNTRY_RSS_MAP[code] || [];
  const targetFeeds: RssFeedConfig[] = [...explicitFeeds];

  // 1. Primary Google News Search in English with valid parameters (US:en)
  const cleanCountryName = country.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  targetFeeds.push({
    name: `${country.name} Political Dispatch`,
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(cleanCountryName + ' politics')}&hl=en-US&gl=US&ceid=US:en`,
  });

  // 2. Multilingual queries if the country speaks French, Spanish, Portuguese, or German
  const primaryLang = country.languages?.[0]?.code || 'en';
  if (primaryLang === 'fr' || language === 'fr') {
    targetFeeds.push({
      name: `${country.name} Actualités Politiques`,
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(cleanCountryName + ' politique')}&hl=fr&gl=FR&ceid=FR:fr`,
    });
  } else if (primaryLang === 'es' || language === 'es') {
    targetFeeds.push({
      name: `${country.name} Noticias Políticas`,
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(cleanCountryName + ' política')}&hl=es&gl=ES&ceid=ES:es`,
    });
  } else if (primaryLang === 'pt' || language === 'pt') {
    targetFeeds.push({
      name: `${country.name} Notícias Políticas`,
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(cleanCountryName + ' política')}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
    });
  } else if (primaryLang === 'de' || language === 'de') {
    targetFeeds.push({
      name: `${country.name} Politik`,
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(cleanCountryName + ' politik')}&hl=de&gl=DE&ceid=DE:de`,
    });
  }

  // 3. Continental authoritative feeds for added coverage
  if (country.continent === 'Africa') {
    targetFeeds.push({
      name: 'AllAfrica Governance',
      url: 'https://allafrica.com/tools/headlines/rdf/politics/headlines.rdf',
    });
    targetFeeds.push({
      name: 'AfricaNews',
      url: 'https://www.africanews.com/feed/rss',
    });
  } else if (country.continent === 'Europe') {
    targetFeeds.push({
      name: 'BBC Europe',
      url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
    });
  } else if (country.continent === 'Asia') {
    targetFeeds.push({
      name: 'BBC Asia',
      url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
    });
  } else if (country.continent === 'Americas' || country.region?.includes('America')) {
    targetFeeds.push({
      name: 'BBC Americas',
      url: 'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml',
    });
  }

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

  const seenTitles = new Set<string>();
  const uniqueArticles: ArticleData[] = [];

  for (const art of fetchedResults) {
    // Strictly skip articles that are about another country or not political
    if (!isPoliticalNews(art.title, art.snippet, art.tags)) continue;
    if (!isRelevantToCountry(art.title, art.snippet, code)) continue;

    const titleKey = art.title.toLowerCase().slice(0, 40);
    if (!seenTitles.has(titleKey)) {
      seenTitles.add(titleKey);
      uniqueArticles.push(art);
    }
  }

  return uniqueArticles.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function extractArticleParagraphs(htmlOrText: string): string {
  if (!htmlOrText) return '';
  const decoded = decodeHtmlEntities(decodeHtmlEntities(htmlOrText));

  // Extract <p> tags
  const pMatches = decoded.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  if (pMatches && pMatches.length > 0) {
    const cleanedParas = pMatches
      .map((p) => cleanRssText(p))
      .filter(
        (p) =>
          p.length > 30 &&
          !p.match(/^(read also|also read|click here|source:|copyright|all rights reserved|advertisement|follow us|join our|subscribe|download our)/i)
      );

    if (cleanedParas.length >= 2) {
      return cleanedParas.join('\n\n');
    }
  }

  // If no <p> tags, check for newline-separated paragraphs
  const cleanAll = cleanRssText(decoded);
  const splitParas = cleanAll.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 30);
  if (splitParas.length >= 2) {
    return splitParas.join('\n\n');
  }

  return cleanAll;
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

    const rawEncoded = getTag('content:encoded');
    const rawDesc = getTag('description') || getTag('summary');
    const pubDateStr = getTag('pubDate') || getTag('dc:date') || getTag('updated');
    const pubDate = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString();

    const sourceTag = getTag('source');

    let titleText = cleanRssText(rawTitle) || decodeHtmlEntities(decodeHtmlEntities(rawTitle)).replace(/<[^>]+>/g, '').trim();

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

    const lowerTitle = titleText.toLowerCase();
    if (
      lowerTitle.startsWith('[photos]') ||
      lowerTitle.startsWith('photos:') ||
      lowerTitle.startsWith('photo:') ||
      lowerTitle.startsWith('[photo]') ||
      lowerTitle.startsWith('[pictures]') ||
      lowerTitle.startsWith('pictures:') ||
      lowerTitle.startsWith('[images]') ||
      lowerTitle.includes('[photos]') ||
      lowerTitle.includes('(photos)') ||
      lowerTitle.includes('[pictures]') ||
      lowerTitle.includes('photo gallery')
    ) {
      return;
    }

    // Decline columnist / opinion / editorial articles for now
    if (isColumnistOrOpinion(titleText, rawDesc, [], link)) {
      return;
    }

    // Direct content image extraction
    let imageUrl: string | undefined = undefined;
    const enclosureMatch = itemXml.match(/<(?:enclosure|media:content)[^>]+url=["']([^"']+)["']/i);
    if (enclosureMatch && enclosureMatch[1].match(/https?:\/\//i)) {
      imageUrl = enclosureMatch[1];
    } else {
      const imgMatch = (rawEncoded || rawDesc).match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1].match(/^https?:\/\//i)) {
        imageUrl = imgMatch[1];
      }
    }

    // Validate image: if it's a known placeholder or site logo, omit it so crisp fallback visual is used
    if (imageUrl && !isValidContentImage(imageUrl)) {
      imageUrl = undefined;
    }

    // Extract full real article paragraphs
    let fullArticleText = extractArticleParagraphs(rawEncoded);
    if (!fullArticleText || fullArticleText.length < 200) {
      const descParas = extractArticleParagraphs(rawDesc);
      if (descParas && descParas.length > 200) {
        fullArticleText = descParas;
      }
    }

    let cleanSnippet = cleanRssText(rawDesc || rawEncoded);
    if (!cleanSnippet || cleanSnippet.length < 15 || cleanSnippet.includes('<a href')) {
      cleanSnippet = `${titleText}. Verified political dispatch for ${countryName}.`;
    } else {
      cleanSnippet = formatCleanSnippet(cleanSnippet, 280);
    }

    // Strictly synthesize a clean 4-paragraph VoxPolis brief (no commercials, no verbatim dumps)
    const finalContent = synthesize4ParagraphBrief(
      titleText,
      cleanSnippet,
      fullArticleText,
      sourceName,
      countryName
    );

    const slug = generateSlug(titleText);
    const articleId = `rss-${countryCode.toLowerCase()}-${slug}`;
    const displayTitle = titleText.endsWith(' - Voxpolis') ? titleText : `${titleText} - Voxpolis`;

    articles.push({
      id: articleId,
      slug,
      title: displayTitle,
      snippet: cleanSnippet,
      content: finalContent,
      ai_analysis: generateAiAnalysisSummary(titleText, cleanSnippet, sourceName, countryName),
      country_code: countryCode,
      language: 'en',
      category: 'politics',
      image_mode: imageUrl ? 'original' : 'breaking_logo',
      original_image_url: imageUrl,
      source_name: sourceName,
      source_url: link || 'https://voxpolis.app',
      is_breaking: idx === 0,
      tags: ['Politics', countryName, sourceName],
      views_count: 0,
      total_reading_time_seconds: 180,
      created_at: pubDate,
      poll: (() => {
        const q = generateCivicPollQuestion(titleText, cleanSnippet);
        return q ? {
          id: `poll-${articleId}`,
          question: q,
          agree_count: 0,
          disagree_count: 0,
        } : undefined;
      })(),
    });
  });

  return articles;
}
