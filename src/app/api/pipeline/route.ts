import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { processSourceUrlThroughPipeline, getAllPublishedPipelineArticles } from '@/lib/pipeline';
import { runBackfillJob } from '@/lib/pipeline/backfill';
import { fetchArticlesForCountry } from '@/lib/news';
import { fetchRssArticlesForCountry } from '@/lib/rss';

export const dynamic = 'force-dynamic';

function timingSafeMatch(candidate: string, expected: string): boolean {
  if (!candidate || !expected) return false;
  const candidateBuf = Buffer.from(candidate, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (candidateBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(candidateBuf, expectedBuf);
}

async function verifyPipelineAuth(request: NextRequest): Promise<{
  authorized: boolean;
  status?: number;
  error?: string;
  mode?: 'cron' | 'admin';
  user?: any;
}> {
  try {
    // 1. Check configured CRON_SECRET (fail-closed if missing or empty; never use a hardcoded default)
    const configuredSecret = (process.env.CRON_SECRET || '').trim();
    const authHeader = request.headers.get('authorization');
    const bearerToken =
      authHeader && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : '';
    const headerSecret = (request.headers.get('x-cron-secret') || '').trim();
    let querySecret = '';
    try {
      querySecret = (new URL(request.url).searchParams.get('secret') || '').trim();
    } catch {
      // Ignore malformed URL when parsing query params
    }

    if (configuredSecret.length > 0) {
      if (
        (bearerToken && timingSafeMatch(bearerToken, configuredSecret)) ||
        (headerSecret && timingSafeMatch(headerSecret, configuredSecret)) ||
        (querySecret && timingSafeMatch(querySecret, configuredSecret))
      ) {
        return { authorized: true, mode: 'cron' };
      }
    }

    // If caller explicitly supplied a cron secret header/query param and it failed (or CRON_SECRET is unset), fail closed immediately
    if (headerSecret || querySecret) {
      return {
        authorized: false,
        status: 401,
        error:
          configuredSecret.length === 0
            ? 'Unauthorized: CRON_SECRET is not configured'
            : 'Unauthorized: Invalid pipeline secret',
      };
    }

    // 2. Otherwise verify authenticated administrator via Bearer JWT or SSR session cookies
    let user = null;

    if (bearerToken) {
      const { data: userData, error: tokenErr } = await supabaseAdmin.auth.getUser(bearerToken);
      if (!tokenErr && userData?.user) {
        user = userData.user;
      }
    }

    if (!user) {
      try {
        const supabase = await createClient();
        const { data: cookieUserData, error: cookieErr } = await supabase.auth.getUser();
        if (!cookieErr && cookieUserData?.user) {
          user = cookieUserData.user;
        }
      } catch {
        // Expected when invoked outside Next.js request context or if cookies unavailable
      }
    }

    if (!user) {
      return {
        authorized: false,
        status: 401,
        error:
          configuredSecret.length === 0
            ? 'Unauthorized: CRON_SECRET is not configured and authentication is required'
            : 'Unauthorized: Valid CRON_SECRET or administrator authentication required',
      };
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.is_admin !== true) {
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: Administrator privileges required',
      };
    }

    return { authorized: true, mode: 'admin', user };
  } catch {
    return { authorized: false, status: 500, error: 'Authentication error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyPipelineAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

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
        body.country_code || 'NG',
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
      const processed = await pollFeedsForCountry(countryCode);

      return NextResponse.json({
        success: true,
        processed_count: processed.length,
        processed,
      });
    }

    return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: 'Pipeline execution failed' },
      { status: 500 }
    );
  }
}

async function pollFeedsForCountry(countryCode: string) {
  const candidateArticles = await fetchRssArticlesForCountry(countryCode);
  const processed: any[] = [];
  for (const art of candidateArticles) {
    if (art.source_url && art.source_url.startsWith('http')) {
      const res = await processSourceUrlThroughPipeline(
        art.source_url,
        art.source_name,
        art.title,
        art.snippet,
        art.created_at,
        countryCode
      );
      processed.push({ url: art.source_url, status: res.status, slug: res.slug });
    }
  }

  const apiKey = process.env.NEWSDATA_API_KEY;
  if (apiKey && apiKey !== 'pub_demo_key' && apiKey.trim() !== '') {
    try {
      const ndUrl = `https://newsdata.io/api/1/news?apikey=${apiKey}&country=${countryCode.toLowerCase()}&category=politics&language=en`;
      const ndRes = await fetch(ndUrl);
      if (ndRes.ok) {
        const ndData = await ndRes.json();
        if (ndData.results && Array.isArray(ndData.results)) {
          for (const item of ndData.results) {
            if (item.link && item.link.startsWith('http')) {
              const res = await processSourceUrlThroughPipeline(
                item.link,
                item.source_id || 'NewsData Wire',
                item.title,
                item.description || item.snippet,
                item.pubDate,
                countryCode
              );
              processed.push({ url: item.link, status: res.status, slug: res.slug });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error polling NewsData in pipeline:', e);
    }
  }

  return processed;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyPipelineAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const urlParam = searchParams.get('url');

    if (urlParam && urlParam.startsWith('http')) {
      const article = await processSourceUrlThroughPipeline(urlParam, 'Direct URL Ingestion');
      return NextResponse.json({ success: article.status === 'published', article });
    }

    if (action === 'poll_feeds') {
      const countryCode = (searchParams.get('country') || 'NG').toUpperCase();
      const processed = await pollFeedsForCountry(countryCode);
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
  } catch {
    return NextResponse.json(
      { error: 'Pipeline execution failed' },
      { status: 500 }
    );
  }
}
