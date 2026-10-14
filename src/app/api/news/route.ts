import { NextRequest, NextResponse } from 'next/server';
import { getCountryByCode } from '@/config/countries';
import {
  ArticleData,
  generateAiAnalysisSummary,
  isPoliticalNews,
  getFallbackArticlesForCountry,
} from '@/lib/news';
import { isCurrentMonthArticle } from '@/lib/rss';
import { decodeAllHtmlEntities } from '@/lib/news-rewriter';
import { get301Redirect } from '@/lib/pipeline/redirects';
import {
  getPipelineArticleBySlug,
  getAllPublishedPipelineArticles,
} from '@/lib/pipeline';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slugParam = searchParams.get('slug');
  const countryCode = (searchParams.get('country') || 'NG').toUpperCase();
  const language = (searchParams.get('language') || 'en').toLowerCase();
  const country = getCountryByCode(countryCode);

  // 1. Single article requested by slug
  if (slugParam) {
    const rawTargetSlug = get301Redirect(slugParam) || slugParam;

    // 1a. Query durable Supabase articles table
    try {
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      const { data: dbArticle } = await supabaseAdmin
        .from('articles')
        .select('*')
        .or(`slug.eq.${rawTargetSlug},slug.eq.${slugParam}`)
        .maybeSingle();

      if (dbArticle) {
        const cleanTitle = decodeAllHtmlEntities(dbArticle.title || 'Political Update');
        const cleanSnippet = decodeAllHtmlEntities(dbArticle.snippet || '');
        const cleanContent = decodeAllHtmlEntities(dbArticle.content || '');

        if (!isPoliticalNews(cleanTitle, cleanSnippet, dbArticle.tags || [])) {
          return NextResponse.json(
            { success: false, error: 'Non-political content excluded from Voxpolis' },
            { status: 404 }
          );
        }

        // Query if this article has a specific poll attached to it
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
            country_code: dbArticle.country_code || countryCode,
            source_name: dbArticle.source_name || 'Voxpolis Desk',
            source_url: dbArticle.source_url || 'https://voxpolis.app',
            original_image_url: dbArticle.original_image_url,
            is_breaking: dbArticle.is_breaking === true,
            is_featured:
              dbArticle.is_featured !== undefined
                ? dbArticle.is_featured
                : (dbArticle.tags?.some((t: string) => /featured/i.test(t)) || true),
            tags: dbArticle.tags || ['Featured News', country.name, 'Voxpolis'],
            views_count: dbArticle.views_count || 0,
            total_reading_time_seconds: dbArticle.total_reading_time_seconds || 180,
            author:
              dbArticle.author ||
              dbArticle.tags?.find((t: string) => typeof t === 'string' && t.startsWith('By '))?.slice(3) ||
              undefined,
            poll: attachedPoll,
          },
          redirectedSlug: dbArticle.slug !== slugParam ? dbArticle.slug : undefined,
        });
      }
    } catch (e) {
      console.warn('Error reading article from database:', e);
    }

    // 1b. Check pipeline articles
    const pipeArt =
      getPipelineArticleBySlug(rawTargetSlug) || getPipelineArticleBySlug(slugParam);
    if (pipeArt && pipeArt.status === 'published') {
      const artData: ArticleData = {
        id: pipeArt.id,
        slug: pipeArt.slug,
        title: pipeArt.headline,
        snippet: pipeArt.dek || pipeArt.executive_summary || '',
        content: pipeArt.body_markdown || pipeArt.executive_summary || '',
        ai_analysis: generateAiAnalysisSummary(
          pipeArt.headline,
          pipeArt.dek || pipeArt.executive_summary || '',
          pipeArt.source_name,
          country.name
        ),
        country_code: pipeArt.country_code,
        language: pipeArt.language || language,
        category: pipeArt.category || 'politics',
        image_mode: pipeArt.original_image_url ? 'original' : 'breaking_logo',
        original_image_url: pipeArt.original_image_url,
        source_name: pipeArt.source_name,
        source_url: pipeArt.source_url,
        is_breaking: false,
        is_featured: false,
        tags: pipeArt.tags || ['Politics', 'Voxpolis'],
        views_count: 0,
        total_reading_time_seconds: (pipeArt.read_minutes || 3) * 60,
        created_at: pipeArt.created_at,
      };
      return NextResponse.json({
        success: true,
        article: artData,
        redirectedSlug: pipeArt.slug !== slugParam ? pipeArt.slug : undefined,
      });
    }

    // 1c. Check localized country civic fallback templates
    const prefixMatch = slugParam.match(/^([a-z]{2})-/i);
    const targetCode = prefixMatch ? prefixMatch[1].toUpperCase() : countryCode;
    const fallbackList = getFallbackArticlesForCountry(targetCode, language);
    const fallbackFound = fallbackList.find(
      (a) =>
        a.slug === rawTargetSlug ||
        a.slug === slugParam ||
        a.legacy_slug === rawTargetSlug ||
        a.legacy_slug === slugParam
    );
    if (fallbackFound) {
      return NextResponse.json({
        success: true,
        article: fallbackFound,
      });
    }

    // 1d. Safe 404: Never fall back to unrewritten wire RSS dumps on visitor request
    return NextResponse.json(
      { success: false, error: 'Article not found' },
      { status: 404 }
    );
  }

  // 2. Fetch Country News Feed
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
          ai_analysis:
            dbArticle.ai_analysis ||
            generateAiAnalysisSummary(
              cleanTitle,
              cleanSnippet,
              dbArticle.source_name || 'Voxpolis Desk',
              country.name
            ),
          country_code: dbArticle.country_code || countryCode,
          language: dbArticle.language || language,
          category: dbArticle.category || 'politics',
          image_mode: dbArticle.original_image_url ? ('original' as const) : ('breaking_logo' as const),
          original_image_url: dbArticle.original_image_url || undefined,
          source_name: dbArticle.source_name || 'Voxpolis Desk',
          source_url: dbArticle.source_url || `https://voxpolis.app/news/${dbArticle.slug}`,
          is_breaking: dbArticle.is_breaking === true,
          is_featured: dbArticle.is_featured !== undefined ? dbArticle.is_featured : true,
          tags: dbArticle.tags || ['Featured News', country.name, 'Voxpolis'],
          views_count: dbArticle.views_count || 0,
          total_reading_time_seconds: dbArticle.total_reading_time_seconds || 180,
          created_at: dbArticle.created_at || new Date().toISOString(),
          author:
            dbArticle.author ||
            dbArticle.tags?.find((t: string) => typeof t === 'string' && t.startsWith('By '))?.slice(3) ||
            undefined,
          poll:
            dbPoll && dbPoll.question
              ? {
                  id: dbPoll.id,
                  question: dbPoll.question,
                  agree_count: dbPoll.agree_count || 0,
                  disagree_count: dbPoll.disagree_count || 0,
                }
              : undefined,
        };
      });
    }
  } catch (e) {
    console.warn('Error fetching database articles for country feed:', e);
  }

  // 3. Fetch published pipeline articles for this country
  const pipelineCountryArticles: ArticleData[] = getAllPublishedPipelineArticles()
    .filter(
      (p) =>
        p.country_code.toUpperCase() === countryCode &&
        isCurrentMonthArticle(p.created_at)
    )
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.headline,
      snippet: p.dek || p.executive_summary || '',
      content: p.body_markdown || p.executive_summary || '',
      ai_analysis: generateAiAnalysisSummary(
        p.headline,
        p.dek || p.executive_summary || '',
        p.source_name,
        country.name
      ),
      country_code: p.country_code,
      language: p.language || language,
      category: p.category || 'politics',
      image_mode: p.original_image_url ? ('original' as const) : ('breaking_logo' as const),
      original_image_url: p.original_image_url,
      source_name: p.source_name,
      source_url: p.source_url,
      is_breaking: false,
      is_featured: false,
      tags: p.tags || ['Politics', country.name, 'Voxpolis'],
      views_count: 0,
      total_reading_time_seconds: (p.read_minutes || 3) * 60,
      created_at: p.created_at,
      author: undefined,
    }));

  // 4. Merge durable database articles with published pipeline articles (deduplicating by slug & title)
  const seenSlugs = new Set<string>();
  const seenTitles = new Set<string>();
  const combinedArticles: ArticleData[] = [];

  for (const art of [...dbCountryArticles, ...pipelineCountryArticles]) {
    const normTitle = art.title.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    if (!seenSlugs.has(art.slug) && !seenTitles.has(normTitle)) {
      seenSlugs.add(art.slug);
      seenTitles.add(normTitle);
      combinedArticles.push(art);
    }
  }

  // 5. If no published articles exist for this country, fallback to structured civic briefs
  if (combinedArticles.length === 0) {
    const fallbackArticles = getFallbackArticlesForCountry(countryCode, language);
    return NextResponse.json(
      { articles: fallbackArticles, cached: false },
      { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }
    );
  }

  return NextResponse.json(
    { articles: combinedArticles, cached: false },
    { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }
  );
}
