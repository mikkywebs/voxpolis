import { NextRequest, NextResponse } from 'next/server';
import { processSourceUrlThroughPipeline, getAllPublishedPipelineArticles } from '@/lib/pipeline';
import { runBackfillJob } from '@/lib/pipeline/backfill';
import { fetchArticlesForCountry } from '@/lib/news';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'process_url';

    if (action === 'process_url') {
      const sourceUrl = body.source_url;
      if (!sourceUrl || typeof sourceUrl !== 'string' || !sourceUrl.startsWith('http')) {
        return NextResponse.json(
          { error: 'Valid source_url parameter is required' },
          { status: 400 }
        );
      }

      const article = await processSourceUrlThroughPipeline(
        sourceUrl,
        body.source_name || 'Press Outlet',
        body.headline || '',
        body.description || '',
        body.published_at,
        body.force || false
      );

      if (article.status !== 'published') {
        return NextResponse.json(
          {
            success: false,
            status: article.status,
            reason: article.incomplete_reason,
            article,
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        article,
      });
    }

    if (action === 'backfill') {
      const countryCode = body.country_code || 'NG';
      const legacyArticles = await fetchArticlesForCountry(countryCode);
      const backfillResult = await runBackfillJob(legacyArticles);

      return NextResponse.json({
        success: true,
        result: backfillResult,
      });
    }

    if (action === 'poll_feeds') {
      const countryCode = (body.country_code || 'NG').toUpperCase();
      const legacyArticles = await fetchArticlesForCountry(countryCode);

      const processed: any[] = [];
      for (const art of legacyArticles) {
        if (art.source_url && art.source_url.startsWith('http')) {
          const res = await processSourceUrlThroughPipeline(
            art.source_url,
            art.source_name,
            art.title,
            art.snippet,
            art.created_at
          );
          processed.push({ url: art.source_url, status: res.status, slug: res.slug });
        }
      }

      return NextResponse.json({
        success: true,
        processed_count: processed.length,
        processed,
      });
    }

    return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Pipeline execution failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const urlParam = searchParams.get('url');

  if (urlParam && urlParam.startsWith('http')) {
    const article = await processSourceUrlThroughPipeline(urlParam, 'Direct URL Ingestion');
    return NextResponse.json({ success: article.status === 'published', article });
  }

  if (action === 'poll_feeds') {
    const countryCode = (searchParams.get('country') || 'NG').toUpperCase();
    const legacyArticles = await fetchArticlesForCountry(countryCode);
    const processed: any[] = [];
    for (const art of legacyArticles) {
      if (art.source_url && art.source_url.startsWith('http')) {
        const res = await processSourceUrlThroughPipeline(
          art.source_url,
          art.source_name,
          art.title,
          art.snippet,
          art.created_at
        );
        processed.push({ url: art.source_url, status: res.status, slug: res.slug });
      }
    }
    return NextResponse.json({ success: true, processed_count: processed.length, processed });
  }

  if (action === 'backfill') {
    const countryCode = searchParams.get('country') || 'NG';
    const legacyArticles = await fetchArticlesForCountry(countryCode);
    const backfillResult = await runBackfillJob(legacyArticles);
    return NextResponse.json({ success: true, result: backfillResult });
  }

  const articles = getAllPublishedPipelineArticles();
  return NextResponse.json({
    total_published: articles.length,
    articles,
  });
}
