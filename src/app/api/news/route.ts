import { NextRequest, NextResponse } from 'next/server';
import { fetchRssArticlesForCountry } from '@/lib/rss';
import { getCountryByCode } from '@/config/countries';
import { ArticleData } from '@/lib/news';

// In-Memory Server Cache to strictly protect NewsData 200 API credits / day
// TTL set to 2 hours (7,200,000 ms) per country
interface CacheEntry {
  timestamp: number;
  data: ArticleData[];
}

const cacheMap = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 Hours

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countryCode = (searchParams.get('country') || 'NG').toUpperCase();
  const language = (searchParams.get('language') || 'en').toLowerCase();
  const cacheKey = `${countryCode}_${language}`;

  // 1. Check Server Memory Cache
  const cached = cacheMap.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ articles: cached.data, cached: true });
  }

  const country = getCountryByCode(countryCode);
  const apiKey = process.env.NEWSDATA_API_KEY;
  let newsDataArticles: ArticleData[] = [];

  // 2. Fetch from NewsData API if valid key is configured
  if (apiKey && apiKey !== 'pub_demo_key' && apiKey.trim() !== '') {
    try {
      const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&country=${countryCode.toLowerCase()}&category=politics&language=${language}`;
      const res = await fetch(url, { next: { revalidate: 7200 } });
      
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          newsDataArticles = data.results.map((item: any, idx: number) => ({
            id: item.article_id || `newsdata-${countryCode}-${idx}`,
            slug:
              (item.title || 'article')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '') + `-${idx}`,
            title: item.title || 'Political Update',
            snippet: item.description || item.snippet || item.title || '',
            content: item.content || item.description || item.title || '',
            ai_analysis: `Analysis of Article Facts:\n- Summary: ${item.description || item.title}\n- Source Outlet: ${item.source_id || 'NewsData'}\n- Published Date: ${item.pubDate || new Date().toLocaleString()}`,
            country_code: countryCode,
            language: language,
            category: item.category?.[0] || 'politics',
            image_mode: item.image_url ? 'original' : 'breaking_logo',
            original_image_url: item.image_url || undefined,
            source_name: item.source_id || `${country.name} Press`,
            source_url: item.link || 'https://voxpolis.app',
            is_breaking: idx === 0,
            tags: item.keywords || ['Politics', country.name],
            views_count: Math.floor(Math.random() * 2500) + 850,
            total_reading_time_seconds: 180,
            created_at: item.pubDate || new Date().toISOString(),
            poll: {
              id: `poll-newsdata-${idx}`,
              question: `Do you agree with the policy developments reported by ${item.source_id || 'this source'}?`,
              agree_count: 340,
              disagree_count: 45,
            },
          }));
        }
      }
    } catch (err) {
      console.warn('NewsData API fetch encountered an error, relying on RSS feeds.', err);
    }
  }

  // 3. Fetch Prompt RSS Country Feeds (DailyPost, Vanguard, Premium Times, Google News RSS, etc.)
  const rssArticles = await fetchRssArticlesForCountry(countryCode, language);

  // 4. Combine NewsData + RSS Feeds (NewsData first, then RSS)
  const combined = [...newsDataArticles, ...rssArticles];

  // Deduplicate by title similarity
  const seenTitles = new Set<string>();
  const uniqueArticles: ArticleData[] = [];

  for (const art of combined) {
    const key = art.title.toLowerCase().slice(0, 35);
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      uniqueArticles.push(art);
    }
  }

  // 5. Store in Server Cache
  if (uniqueArticles.length > 0) {
    cacheMap.set(cacheKey, { timestamp: now, data: uniqueArticles });
  }

  return NextResponse.json({ articles: uniqueArticles, cached: false });
}
