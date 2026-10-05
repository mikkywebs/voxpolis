import { NextRequest, NextResponse } from 'next/server';
import { fetchRssArticlesForCountry } from '@/lib/rss';
import { getCountryByCode } from '@/config/countries';
import { ArticleData, generateAiAnalysisSummary, expandToJournalisticArticle, generateCivicPollQuestion, isColumnistOrOpinion } from '@/lib/news';
import { isValidContentImage } from '@/lib/pipeline/extractor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slugParam = searchParams.get('slug');
  const countryCode = (searchParams.get('country') || 'NG').toUpperCase();
  const language = (searchParams.get('language') || 'en').toLowerCase();

  // If a specific slug is requested, first check permanent database
  if (slugParam) {
    try {
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const { data: dbArticle } = await supabaseAdmin
        .from('articles')
        .select('*')
        .eq('slug', slugParam)
        .maybeSingle();

      if (dbArticle) {
        return NextResponse.json({
          success: true,
          article: {
            id: dbArticle.id || `db-${dbArticle.slug}`,
            slug: dbArticle.slug,
            title: dbArticle.title,
            snippet: dbArticle.snippet,
            content: dbArticle.content,
            country_code: dbArticle.country_code || 'NG',
            source_name: dbArticle.source_name || 'Voxpolis Desk',
            source_url: dbArticle.source_url || 'https://voxpolis.app',
            original_image_url: dbArticle.original_image_url,
            image_mode: 'original' as const,
            is_breaking: false,
            tags: dbArticle.tags || ['Politics'],
            views_count: 0,
            total_reading_time_seconds: 180,
            created_at: dbArticle.created_at || new Date().toISOString(),
            author: dbArticle.author,
          },
        });
      }
    } catch {}
  }

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
            .filter((item: any) => isValidContentImage(item.image_url) && !isColumnistOrOpinion(item.title, item.description, item.keywords || item.category, item.link))
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

              const displayTitle = cleanTitle.endsWith(' - Voxpolis') ? cleanTitle : `${cleanTitle} - Voxpolis`;
              const cleanSlug = cleanTitle
                .toLowerCase()
                .replace(/ - voxpolis$/i, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
                .slice(0, 80);

              return {
                id: item.article_id || `newsdata-${countryCode}-${idx}`,
                slug: cleanSlug,
                title: displayTitle,
                snippet: rawDesc,
                content: rawContent.length > 250 ? rawContent : expandToJournalisticArticle(displayTitle, rawDesc, sourceName, country.name, country.capital, item.category?.[0]),
                ai_analysis: generateAiAnalysisSummary(displayTitle, rawDesc, sourceName, country.name),
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
                  question: generateCivicPollQuestion(cleanTitle, rawDesc),
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

  // Deduplicate by story key & enforce political filtering and country relevance
  const seenStoryKeys = new Set<string>();
  const uniqueArticles: ArticleData[] = [];

  for (const art of combined) {
    if (!isPoliticalNews(art.title, art.snippet, art.tags)) continue;
    if (!isRelevantToCountry(art.title, art.snippet, countryCode)) continue;
    if (!isValidContentImage(art.original_image_url)) continue;

    const normKey = art.title
      .toLowerCase()
      .replace(/ - voxpolis$/i, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 6)
      .join(' ');

    if (!seenStoryKeys.has(normKey) && !seenStoryKeys.has(art.slug)) {
      seenStoryKeys.add(normKey);
      seenStoryKeys.add(art.slug);
      uniqueArticles.push(art);
    }
  }

  // If specific slug was requested, check collected feed articles
  if (slugParam) {
    const foundInFeeds = uniqueArticles.find((a) => a.slug === slugParam);
    if (foundInFeeds) {
      return NextResponse.json({
        success: true,
        article: foundInFeeds,
      });
    }

    // Check across other active country feeds
    const otherCountryCodes = ['US', 'GB', 'ZA', 'GH', 'KE', 'CA', 'AU', 'IN', 'NG'].filter((c) => c !== countryCode);
    for (const otherCode of otherCountryCodes) {
      try {
        const otherFeeds = await fetchRssArticlesForCountry(otherCode, language);
        const match = otherFeeds.find((a) => a.slug === slugParam);
        if (match) {
          return NextResponse.json({
            success: true,
            article: match,
          });
        }
      } catch {}
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
