import { NextRequest, NextResponse } from 'next/server';
import { fetchRssArticlesForCountry } from '@/lib/rss';
import { getCountryByCode } from '@/config/countries';
import { ArticleData, generateAiAnalysisSummary, expandToJournalisticArticle, generateCivicPollQuestion, isColumnistOrOpinion, isPoliticalNews, isRelevantToCountry } from '@/lib/news';
import { isValidContentImage } from '@/lib/pipeline/extractor';
import { rewriteStoryForVoxpolis, decodeAllHtmlEntities } from '@/lib/news-rewriter';
import { register301Redirect, get301Redirect } from '@/lib/pipeline/redirects';

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
        let cleanTitle = decodeAllHtmlEntities(dbArticle.title || 'Political Update');
        let cleanSnippet = decodeAllHtmlEntities(dbArticle.snippet || '');
        let cleanContent = decodeAllHtmlEntities(dbArticle.content || '');

        if (!isPoliticalNews(cleanTitle, cleanSnippet, dbArticle.tags || [])) {
          return NextResponse.json({ success: false, error: 'Non-political content excluded from Voxpolis' }, { status: 404 });
        }

        // Query if this article has a specific poll attached to it in the polls table
        let attachedPoll = undefined;
        try {
          const { data: pollRow } = await supabaseAdmin
            .from('polls')
            .select('id, question, agree_count, disagree_count')
            .eq('article_id', dbArticle.id)
            .maybeSingle();

          if (pollRow && pollRow.question) {
            attachedPoll = {
              id: pollRow.id,
              question: pollRow.question,
              agree_count: pollRow.agree_count || 0,
              disagree_count: pollRow.disagree_count || 0,
            };
          }
        } catch {}

        return NextResponse.json({
          success: true,
          article: {
            id: dbArticle.id || `db-${dbArticle.slug}`,
            slug: dbArticle.slug,
            title: cleanTitle,
            snippet: cleanSnippet,
            content: cleanContent,
            country_code: dbArticle.country_code || 'NG',
            source_name: dbArticle.source_name || 'Voxpolis Desk',
            source_url: dbArticle.source_url || 'https://voxpolis.app',
            original_image_url: dbArticle.original_image_url,
            is_breaking: dbArticle.is_breaking === true,
            is_featured: dbArticle.is_featured !== undefined ? dbArticle.is_featured : (dbArticle.tags?.some((t: string) => /featured/i.test(t)) || true),
            tags: dbArticle.tags || ['Featured News', 'Politics', 'Voxpolis'],
            views_count: dbArticle.views_count || 0,
            total_reading_time_seconds: dbArticle.total_reading_time_seconds || 180,
            created_at: dbArticle.created_at || new Date().toISOString(),
            author: dbArticle.author,
            poll: attachedPoll,
          },
        });
      }
    } catch {}
  }

  const country = getCountryByCode(countryCode);

  // 0. Fetch articles directly published to Supabase database for this country
  let dbCountryArticles: ArticleData[] = [];
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { data: dbRows, error: dbErr } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('country_code', countryCode)
      .order('created_at', { ascending: false });

    if (!dbErr && dbRows && dbRows.length > 0) {
      const articleIds = dbRows.map((r: any) => r.id).filter(Boolean);
      const pollsMap = new Map();
      if (articleIds.length > 0) {
        try {
          const { data: pollsData } = await supabaseAdmin
            .from('polls')
            .select('id, article_id, question, agree_count, disagree_count')
            .in('article_id', articleIds);
          if (pollsData) {
            pollsData.forEach((p: any) => pollsMap.set(p.article_id, p));
          }
        } catch {}
      }

      dbCountryArticles = dbRows.map((dbArticle: any) => {
        const cleanTitle = decodeAllHtmlEntities(dbArticle.title || 'Political Update');
        const cleanSnippet = decodeAllHtmlEntities(dbArticle.snippet || '');
        const cleanContent = decodeAllHtmlEntities(dbArticle.content || '');
        const dbPoll = pollsMap.get(dbArticle.id);

        return {
          id: dbArticle.id || `db-${dbArticle.slug}`,
          slug: dbArticle.slug,
          title: cleanTitle,
          snippet: cleanSnippet,
          content: cleanContent,
          ai_analysis: dbArticle.ai_analysis || generateAiAnalysisSummary(cleanTitle, cleanSnippet, dbArticle.source_name || 'Voxpolis', country.name),
          country_code: dbArticle.country_code || countryCode,
          language: dbArticle.language || language,
          category: dbArticle.category || 'politics',
          image_mode: 'original' as const,
          original_image_url: dbArticle.original_image_url || '/breaking-news-banner.png',
          source_name: dbArticle.source_name || 'Voxpolis',
          source_url: dbArticle.source_url || `https://voxpolis.app/news/${dbArticle.slug}`,
          is_breaking: dbArticle.is_breaking === true,
          is_featured: dbArticle.is_featured !== undefined ? dbArticle.is_featured : true,
          tags: dbArticle.tags || ['Featured News', country.name, 'Voxpolis'],
          views_count: dbArticle.views_count || 0,
          total_reading_time_seconds: dbArticle.total_reading_time_seconds || 180,
          created_at: dbArticle.created_at || new Date().toISOString(),
          author: dbArticle.author,
          poll: dbPoll && dbPoll.question ? {
            id: dbPoll.id,
            question: dbPoll.question,
            agree_count: dbPoll.agree_count || 0,
            disagree_count: dbPoll.disagree_count || 0,
          } : undefined,
        };
      });
    }
  } catch (e) {
    console.warn('Error fetching database articles for country feed:', e);
  }

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
          const filteredItems = data.results
            .filter((item: any) => !isColumnistOrOpinion(item.title, item.description, item.keywords || item.category, item.link))
            .slice(0, 10);

          newsDataArticles = await Promise.all(
            filteredItems.map(async (item: any, idx: number) => {
              const cleanTitle = (item.title || 'Political Update')
                .replace(/ONLY AVAILABLE IN PAID PLANS/gi, '')
                .replace(/The post .* appeared first on .*/gi, '')
                .replace(/appeared first on .*/gi, '')
                .trim();
              const rawDesc = (item.description || item.snippet || item.title || '')
                .replace(/ONLY AVAILABLE IN PAID PLANS/gi, '')
                .trim();
              const rawContent = (item.content || item.description || item.title || '')
                .replace(/ONLY AVAILABLE IN PAID PLANS/gi, '')
                .trim();
              const sourceName = item.source_id || `${country.name} Press`;

              const rewritten = await rewriteStoryForVoxpolis({
                title: cleanTitle,
                content: rawContent.length > 80 ? rawContent : rawDesc,
                sourceName,
                countryName: country.name,
              });

              // Register redirect from old raw wire slug to new VoxPolis slug
              const rawSlug = cleanTitle
                .toLowerCase()
                .replace(/ - voxpolis$/i, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
                .slice(0, 80);
              if (rawSlug && rewritten.slug) {
                register301Redirect(rawSlug, rewritten.slug);
              }

              const hasValidImg = isValidContentImage(item.image_url);

              return {
                id: item.article_id || `newsdata-${countryCode}-${idx}`,
                slug: rewritten.slug,
                title: rewritten.title,
                snippet: rewritten.snippet,
                content: rewritten.content,
                ai_analysis: generateAiAnalysisSummary(rewritten.title, rewritten.snippet, sourceName, country.name),
                country_code: countryCode,
                language: language,
                category: item.category?.[0] || 'politics',
                image_mode: hasValidImg ? ('original' as const) : ('breaking_logo' as const),
                original_image_url: hasValidImg ? item.image_url : undefined,
                source_name: sourceName,
                source_url: item.link || 'https://voxpolis.app',
                is_breaking: idx === 0,
                tags: item.keywords || ['Politics', country.name],
                views_count: 0,
                total_reading_time_seconds: 180,
                created_at: item.pubDate || new Date().toISOString(),
                poll: (() => {
                  const q = generateCivicPollQuestion(rewritten.title, rewritten.snippet);
                  return q ? {
                    id: `poll-newsdata-${idx}`,
                    question: q,
                    agree_count: 0,
                    disagree_count: 0,
                  } : undefined;
                })(),
              };
            })
          );
        }
      }
    } catch (err) {
      console.warn('NewsData API fetch encountered an error, relying on RSS feeds.', err);
    }
  }

  // 2. Fetch Prompt RSS Country Feeds
  const rssArticles = await fetchRssArticlesForCountry(countryCode, language);

  // 3. Combine NewsData + RSS Feeds
  const combined = [...newsDataArticles, ...rssArticles];

  // Deduplicate by story key & enforce political filtering and country relevance
  const seenStoryKeys = new Set<string>();
  const uniqueArticles: ArticleData[] = [];

  for (const art of combined) {
    if (!isPoliticalNews(art.title, art.snippet, art.tags)) continue;
    if (!isRelevantToCountry(art.title, art.snippet, countryCode)) continue;

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

  // 4. Ensure EVERY unique article on VoxPolis is rewritten into our own concise, unique brief
  const rewrittenArticles: ArticleData[] = await Promise.all(
    uniqueArticles.slice(0, 15).map(async (art) => {
      const paras = (art.content || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      const isAlreadyClean =
        paras.length <= 4 &&
        !art.content.includes('&#') &&
        !art.title.includes('&#') &&
        !art.slug.includes('8216') &&
        !art.slug.includes('8217') &&
        !art.content.match(/(whatsapp group|all rights reserved|click here|read also|telegram)/i);

      if (isAlreadyClean && art.slug) {
        return art;
      }

      const rewritten = await rewriteStoryForVoxpolis({
        title: art.title,
        content: art.content || art.snippet,
        sourceName: art.source_name,
        countryName: country.name,
      });

      if (art.slug && rewritten.slug && art.slug !== rewritten.slug) {
        register301Redirect(art.slug, rewritten.slug);
      }

      return {
        ...art,
        title: rewritten.title,
        slug: rewritten.slug,
        snippet: rewritten.snippet,
        content: rewritten.content,
        ai_analysis: generateAiAnalysisSummary(rewritten.title, rewritten.snippet, art.source_name, country.name),
        poll: (() => {
          const q = generateCivicPollQuestion(rewritten.title, rewritten.snippet);
          return q ? {
            id: `poll-${rewritten.slug}`,
            question: q,
            agree_count: 0,
            disagree_count: 0,
          } : undefined;
        })(),
      };
    })
  );

  // If specific slug was requested, check collected feed articles
  if (slugParam) {
    const rawTargetSlug = get301Redirect(slugParam) || slugParam;
    const normalizedSlug = slugParam
      .replace(/8216|8217|8218|8219/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    const slugTokens = normalizedSlug.split('-').filter((t) => t.length > 3);

    let foundInFeeds = rewrittenArticles.find((a) => {
      if (a.slug === rawTargetSlug || a.slug === slugParam || a.slug === normalizedSlug) return true;
      if (slugTokens.length >= 2) {
        const artTokens = a.slug.split('-').filter((t) => t.length > 3);
        const matches = slugTokens.filter((t) => artTokens.includes(t));
        if (matches.length >= Math.min(3, slugTokens.length)) return true;
      }
      return false;
    });

    if (!foundInFeeds) {
      // 1. Detect 2-letter country prefix if present
      const prefixMatch = slugParam.match(/^([a-z]{2})-/i);
      const prefixCode = prefixMatch ? prefixMatch[1].toUpperCase() : null;

      const priorityCodes = ['NG', 'US', 'GB', 'ZA', 'GH', 'KE', 'CA', 'AU', 'IN', 'FR', 'DE', 'EG', 'SN', 'CI', 'RW', 'UG', 'TZ', 'CM', 'BJ'];
      const candidateCodes = [
        ...(prefixCode && prefixCode !== countryCode ? [prefixCode] : []),
        ...priorityCodes.filter((c) => c !== countryCode && c !== prefixCode),
      ];

      for (const otherCode of candidateCodes) {
        try {
          const otherFeeds = await fetchRssArticlesForCountry(otherCode, language);
          const match = otherFeeds.find((a) => {
            if (a.slug === rawTargetSlug || a.slug === slugParam || a.slug === normalizedSlug) return true;
            if (slugTokens.length >= 2) {
              const artTokens = a.slug.split('-').filter((t) => t.length > 3);
              const matches = slugTokens.filter((t) => artTokens.includes(t));
              if (matches.length >= Math.min(3, slugTokens.length)) return true;
            }
            return false;
          });
          if (match) {
            foundInFeeds = match;
            break;
          }
        } catch {}
      }

      // 2. If still not found, check localized country reports (for fallback/digest stories)
      if (!foundInFeeds) {
        try {
          const targetCode = prefixCode || countryCode;
          const { fetchArticlesForCountry } = await import('@/lib/news');
          const fallbackList = await fetchArticlesForCountry(targetCode, language);
          const match = fallbackList.find((a) => {
            if (a.slug === rawTargetSlug || a.slug === slugParam || a.slug === normalizedSlug) return true;
            if (slugTokens.length >= 2) {
              const artTokens = a.slug.split('-').filter((t) => t.length > 3);
              const matches = slugTokens.filter((t) => artTokens.includes(t));
              if (matches.length >= Math.min(3, slugTokens.length)) return true;
            }
            return false;
          });
          if (match) {
            foundInFeeds = match;
          }
        } catch {}
      }
    }

    if (foundInFeeds) {
      if (!isPoliticalNews(foundInFeeds.title, foundInFeeds.snippet, foundInFeeds.tags)) {
        return NextResponse.json({ success: false, error: 'Non-political report excluded from Voxpolis' }, { status: 404 });
      }

      const paras = (foundInFeeds.content || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      if (paras.length > 4 || foundInFeeds.title.includes('&#') || (foundInFeeds.content && foundInFeeds.content.length > 1600)) {
        const rewritten = await rewriteStoryForVoxpolis({
          title: foundInFeeds.title,
          content: foundInFeeds.content,
          sourceName: foundInFeeds.source_name,
          countryName: country.name,
        });
        foundInFeeds.title = rewritten.title;
        foundInFeeds.slug = rewritten.slug;
        foundInFeeds.content = rewritten.content;
        foundInFeeds.snippet = rewritten.snippet;
      }
      return NextResponse.json({
        success: true,
        article: foundInFeeds,
        redirectedSlug: foundInFeeds.slug !== slugParam ? foundInFeeds.slug : undefined,
      });
    }
  }

  // 5. Merge database-published articles (at the very top) with wire and rewritten articles
  const combinedCountryArticles: ArticleData[] = [
    ...dbCountryArticles,
    ...rewrittenArticles.filter(
      (r) => !dbCountryArticles.some((d) => d.slug === r.slug || d.title.toLowerCase() === r.title.toLowerCase())
    ),
  ];

  // If both database and wire articles are empty, fallback to country localized template
  if (combinedCountryArticles.length === 0) {
    const { fetchArticlesForCountry } = await import('@/lib/news');
    const fallbackArticles = await fetchArticlesForCountry(countryCode, language);
    return NextResponse.json(
      { articles: fallbackArticles, cached: false },
      { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }
    );
  }

  return NextResponse.json(
    { articles: combinedCountryArticles, cached: false },
    { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }
  );
}
