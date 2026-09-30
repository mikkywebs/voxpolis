import { NextRequest, NextResponse } from 'next/server';
import { fetchRssArticlesForCountry } from '@/lib/rss';
import { getCountryByCode } from '@/config/countries';
import { ArticleData, generateAiAnalysisSummary } from '@/lib/news';
import { isValidContentImage } from '@/lib/pipeline/extractor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countryCode = (searchParams.get('country') || 'NG').toUpperCase();
  const language = (searchParams.get('language') || 'en').toLowerCase();

  const country = getCountryByCode(countryCode);
  const apiKey = process.env.NEWSDATA_API_KEY;
  let newsDataArticles: ArticleData[] = [];

  // 1. Fetch from NewsData API if valid key is configured
  if (apiKey && apiKey !== 'pub_demo_key' && apiKey.trim() !== '') {
    try {
      const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&country=${countryCode.toLowerCase()}&category=politics&language=${language}`;
      const res = await fetch(url, { cache: 'no-store' });
      
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          newsDataArticles = data.results
            .filter((item: any) => isValidContentImage(item.image_url))
            .map((item: any, idx: number) => {
              const cleanTitle = (item.title || 'Political Update')
                .replace(/ONLY AVAILABLE IN PAID PLANS/gi, '')
                .replace(/The post .* appeared first on .*/gi, '')
                .replace(/appeared first on .*/gi, '')
                .trim();
              const rawDesc = (item.description || item.snippet || item.title || '')
                .replace(/ONLY AVAILABLE IN PAID PLANS/gi, '')
                .replace(/The post .* appeared first on .*/gi, '')
                .replace(/appeared first on .*/gi, '')
                .trim();
              const rawContent = (item.content || item.description || item.title || '')
                .replace(/ONLY AVAILABLE IN PAID PLANS/gi, '')
                .replace(/The post .* appeared first on .*/gi, '')
                .replace(/appeared first on .*/gi, '')
                .trim();
              const sourceName = item.source_id || `${country.name} Press`;

              return {
                id: item.article_id || `newsdata-${countryCode}-${idx}`,
                slug:
                  cleanTitle
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '') + `-${idx}`,
                title: cleanTitle,
                snippet: rawDesc,
                content: rawContent,
                ai_analysis: generateAiAnalysisSummary(cleanTitle, rawDesc, sourceName, country.name),
                country_code: countryCode,
                language: language,
                category: item.category?.[0] || 'politics',
                image_mode: 'original' as const,
                original_image_url: item.image_url,
                source_name: sourceName,
                source_url: item.link || 'https://voxpolis.app',
                is_breaking: idx === 0,
                tags: item.keywords || ['Politics', country.name],
                views_count: 0,
                total_reading_time_seconds: 180,
                created_at: item.pubDate || new Date().toISOString(),
                poll: {
                  id: `poll-newsdata-${idx}`,
                  question: `Do you agree with the stance regarding "${cleanTitle.slice(0, 75)}"?`,
                  agree_count: 0,
                  disagree_count: 0,
                },
              };
            });
        }
      }
    } catch (err) {
      console.warn('NewsData API fetch encountered an error, relying on RSS feeds.', err);
    }
  }

  // 2. Fetch Prompt RSS Country Feeds
  const rssArticles = await fetchRssArticlesForCountry(countryCode, language);

  // 3. Combine NewsData + RSS Feeds
  const { isPoliticalNews, isRelevantToCountry } = await import('@/lib/news');
  const combined = [...newsDataArticles, ...rssArticles];

  // Deduplicate by title similarity & enforce political filtering and country relevance
  const seenTitles = new Set<string>();
  const uniqueArticles: ArticleData[] = [];

  for (const art of combined) {
    if (!isPoliticalNews(art.title, art.snippet, art.tags)) continue;
    if (!isRelevantToCountry(art.title, art.snippet, countryCode)) continue;
    if (!isValidContentImage(art.original_image_url)) continue;

    const key = art.title.toLowerCase().slice(0, 35);
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      uniqueArticles.push(art);
    }
  }

  // 4. Fallback to country localized template if zero articles match
  if (uniqueArticles.length === 0) {
    const { fetchArticlesForCountry } = await import('@/lib/news');
    const fallbackArticles = await fetchArticlesForCountry(countryCode, language);
    return NextResponse.json(
      { articles: fallbackArticles, cached: false },
      { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }
    );
  }

  return NextResponse.json(
    { articles: uniqueArticles, cached: false },
    { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }
  );
}
