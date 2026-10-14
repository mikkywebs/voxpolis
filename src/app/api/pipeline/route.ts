import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { processSourceUrlThroughPipeline, getAllPublishedPipelineArticles } from '@/lib/pipeline';
import { runBackfillJob } from '@/lib/pipeline/backfill';
import { fetchArticlesForCountry } from '@/lib/news';
import { fetchRssArticlesForCountry } from '@/lib/rss';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

    if (action === 'poll_pilot') {
      const countryCode = body.country_code ? String(body.country_code).toUpperCase() : undefined;
      const result = await pollPilotFeeds(countryCode);
      return NextResponse.json(result);
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

const PILOT_COUNTRIES = ['NG', 'US', 'GB', 'GH', 'AU', 'NZ'] as const;

// In-process lock: throttles overlapping invocations within the same serverless container instance.
// Note: In serverless environments, cross-container concurrency is strictly protected at the database
// layer by PostgreSQL unique constraints (code 23505) and validateAndPersistCandidateStory() idempotent
// deduplication, ensuring concurrent invocations can never create duplicate or destructive writes.
let pilotExecutionLock: {
  running: boolean;
  startedAt: number;
} = { running: false, startedAt: 0 };

interface PilotCountryResult {
  country: string;
  candidates_found: number;
  candidates_evaluated: number;
  persisted_count: number;
  persisted_articles: Array<{ slug: string; title: string; source_name: string }>;
  rejection_summary: Record<string, number>;
  status: 'completed' | 'failed' | 'skipped_time_limit';
  error?: string;
}

interface PilotPollResult {
  success: boolean;
  action: 'poll_pilot';
  countries_targeted: string[];
  countries_completed: string[];
  countries_pending: string[];
  countries_failed: string[];
  duration_ms: number;
  total_candidates_found: number;
  total_candidates_evaluated: number;
  total_persisted_count: number;
  persisted_articles: Array<{ slug: string; title: string; source_name: string; country: string }>;
  results_by_country: Record<string, PilotCountryResult>;
  rejection_summary: Record<string, number>;
  status: 'completed' | 'partially_completed' | 'timed_out' | 'failed' | 'already_running';
  reason?: string;
  error?: string;
}

async function pollPilotFeeds(targetCountryCode?: string): Promise<PilotPollResult> {
  const startTime = Date.now();
  // 25-second internal budget leaves a 35-second safety margin below Vercel's 60-second limit
  const TIME_BUDGET_MS = 25_000;
  const MAX_CANDIDATES_PER_COUNTRY = 2;
  const MAX_TOTAL_REWRITES_PER_INVOCATION = 2;

  // 1. In-process concurrency guard
  if (pilotExecutionLock.running && Date.now() - pilotExecutionLock.startedAt < 120_000) {
    return {
      success: true,
      action: 'poll_pilot',
      countries_targeted: [],
      countries_completed: [],
      countries_pending: [],
      countries_failed: [],
      duration_ms: Date.now() - startTime,
      total_candidates_found: 0,
      total_candidates_evaluated: 0,
      total_persisted_count: 0,
      persisted_articles: [],
      results_by_country: {},
      rejection_summary: { overlapping_run_blocked: 1 },
      status: 'already_running',
      reason: 'Prior execution is still active within this container',
    };
  }

  // 2. Determine target country list:
  const normalizedRequested = (targetCountryCode || '').toUpperCase();
  const targetCountries: string[] = PILOT_COUNTRIES.includes(normalizedRequested as any)
    ? [normalizedRequested]
    : [...PILOT_COUNTRIES];

  pilotExecutionLock = { running: true, startedAt: startTime };

  const resultsByCountry: Record<string, PilotCountryResult> = {};
  const globalRejections: Record<string, number> = {};
  const allPersisted: Array<{ slug: string; title: string; source_name: string; country: string }> = [];
  const countriesCompleted: string[] = [];
  const countriesPending: string[] = [];
  const countriesFailed: string[] = [];
  let totalCandidatesFound = 0;
  let totalCandidatesEvaluated = 0;
  let hasHitTimeLimit = false;
  let hasHitRewriteCap = false;

  try {
    const { isPoliticalNews, isRelevantToCountry } = await import('@/lib/news');

    for (let i = 0; i < targetCountries.length; i++) {
      const country = targetCountries[i];

      // Check if time budget is exceeded before starting this country
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        hasHitTimeLimit = true;
        for (let j = i; j < targetCountries.length; j++) {
          countriesPending.push(targetCountries[j]);
          resultsByCountry[targetCountries[j]] = {
            country: targetCountries[j],
            candidates_found: 0,
            candidates_evaluated: 0,
            persisted_count: 0,
            persisted_articles: [],
            rejection_summary: { skipped_time_limit: 1 },
            status: 'skipped_time_limit',
          };
        }
        break;
      }

      // Check if global rewrite cap has already been reached by prior countries
      if (allPersisted.length >= MAX_TOTAL_REWRITES_PER_INVOCATION) {
        hasHitRewriteCap = true;
        for (let j = i; j < targetCountries.length; j++) {
          countriesPending.push(targetCountries[j]);
          resultsByCountry[targetCountries[j]] = {
            country: targetCountries[j],
            candidates_found: 0,
            candidates_evaluated: 0,
            persisted_count: 0,
            persisted_articles: [],
            rejection_summary: { skipped_global_rewrite_cap: 1 },
            status: 'skipped_time_limit',
          };
        }
        break;
      }

      const countryRejections: Record<string, number> = {};
      const countryPersisted: Array<{ slug: string; title: string; source_name: string }> = [];
      let countryEvaluated = 0;

      try {
        const candidates = await fetchRssArticlesForCountry(country);
        totalCandidatesFound += candidates.length;

        for (const art of candidates) {
          if (Date.now() - startTime > TIME_BUDGET_MS) {
            hasHitTimeLimit = true;
            countryRejections['stopped_time_limit'] = (countryRejections['stopped_time_limit'] || 0) + 1;
            break;
          }

          if (allPersisted.length >= MAX_TOTAL_REWRITES_PER_INVOCATION) {
            countryRejections['stopped_global_rewrite_cap'] = (countryRejections['stopped_global_rewrite_cap'] || 0) + 1;
            break;
          }

          if (countryEvaluated >= MAX_CANDIDATES_PER_COUNTRY) {
            break;
          }

          if (!art.source_url || !art.source_url.startsWith('http')) {
            continue;
          }

          // PRE-FLIGHT FILTER 1: Strict Political Gate
          if (!isPoliticalNews(art.title, art.snippet || '', art.tags || [], art.source_url)) {
            countryRejections['rejected_non_political'] = (countryRejections['rejected_non_political'] || 0) + 1;
            globalRejections['rejected_non_political'] = (globalRejections['rejected_non_political'] || 0) + 1;
            continue;
          }

          // PRE-FLIGHT FILTER 2: Country Relevance Gate
          if (!isRelevantToCountry(art.title, art.snippet || '', country)) {
            countryRejections['rejected_country_relevance'] = (countryRejections['rejected_country_relevance'] || 0) + 1;
            globalRejections['rejected_country_relevance'] = (globalRejections['rejected_country_relevance'] || 0) + 1;
            continue;
          }

          countryEvaluated++;
          totalCandidatesEvaluated++;

          // PRE-FLIGHT FILTER 3: Fast Database URL Deduplication
          try {
            const { data: existing } = await supabaseAdmin
              .from('articles')
              .select('id, slug')
              .eq('source_url', art.source_url)
              .maybeSingle();

            if (existing) {
              countryRejections['already_exists_source_url'] = (countryRejections['already_exists_source_url'] || 0) + 1;
              globalRejections['already_exists_source_url'] = (globalRejections['already_exists_source_url'] || 0) + 1;
              continue;
            }
          } catch {}

          // Execute shared Phase 2 pipeline boundary
          const res = await processSourceUrlThroughPipeline(
            art.source_url,
            art.source_name,
            art.title,
            art.snippet,
            art.created_at,
            country
          );

          if (res.status === 'published') {
            const item = {
              slug: res.slug,
              title: res.headline,
              source_name: res.source_name,
            };
            countryPersisted.push(item);
            allPersisted.push({ ...item, country });
          } else {
            const reason = res.incomplete_reason || res.status || 'rejected';
            countryRejections[reason] = (countryRejections[reason] || 0) + 1;
            globalRejections[reason] = (globalRejections[reason] || 0) + 1;
          }
        }

        resultsByCountry[country] = {
          country,
          candidates_found: candidates.length,
          candidates_evaluated: countryEvaluated,
          persisted_count: countryPersisted.length,
          persisted_articles: countryPersisted,
          rejection_summary: countryRejections,
          status: 'completed',
        };
        countriesCompleted.push(country);
      } catch (countryErr: any) {
        countriesFailed.push(country);
        resultsByCountry[country] = {
          country,
          candidates_found: 0,
          candidates_evaluated: 0,
          persisted_count: 0,
          persisted_articles: [],
          rejection_summary: { feed_error: 1 },
          status: 'failed',
          error: countryErr?.message || 'Country feed error',
        };
      }
    }

    const duration = Date.now() - startTime;

    let finalStatus: PilotPollResult['status'] = 'completed';
    let statusReason = 'All targeted countries processed successfully';

    if (countriesCompleted.length === targetCountries.length && countriesFailed.length === 0) {
      finalStatus = 'completed';
      statusReason = 'All targeted countries processed successfully';
    } else if (countriesCompleted.length === 0 && countriesFailed.length === targetCountries.length) {
      finalStatus = 'failed';
      statusReason = 'All country feeds failed to poll';
    } else if (hasHitTimeLimit && countriesCompleted.length === 0) {
      finalStatus = 'timed_out';
      statusReason = 'Time budget reached before any country could complete';
    } else {
      finalStatus = 'partially_completed';
      if (hasHitTimeLimit) {
        statusReason = `Time budget (${TIME_BUDGET_MS / 1000}s) reached with ${countriesPending.length} countries pending`;
      } else if (hasHitRewriteCap) {
        statusReason = `Global rewrite cap (${MAX_TOTAL_REWRITES_PER_INVOCATION}) reached with ${countriesPending.length} countries pending`;
      } else {
        statusReason = `Completed ${countriesCompleted.length}/${targetCountries.length} countries (${countriesFailed.length} failed)`;
      }
    }

    const logData = {
      timestamp: new Date().toISOString(),
      event: 'pipeline_poll_pilot',
      countries_targeted: targetCountries,
      countries_completed: countriesCompleted,
      countries_pending: countriesPending,
      countries_failed: countriesFailed,
      candidates_found: totalCandidatesFound,
      candidates_evaluated: totalCandidatesEvaluated,
      persisted_count: allPersisted.length,
      persisted_slugs: allPersisted.map((p) => p.slug),
      rejections: globalRejections,
      duration_ms: duration,
      status: finalStatus,
      reason: statusReason,
    };
    console.log(`[VoxPolis Ingestion]`, JSON.stringify(logData));

    return {
      success: finalStatus !== 'failed',
      action: 'poll_pilot',
      countries_targeted: targetCountries,
      countries_completed: countriesCompleted,
      countries_pending: countriesPending,
      countries_failed: countriesFailed,
      duration_ms: duration,
      total_candidates_found: totalCandidatesFound,
      total_candidates_evaluated: totalCandidatesEvaluated,
      total_persisted_count: allPersisted.length,
      persisted_articles: allPersisted,
      results_by_country: resultsByCountry,
      rejection_summary: globalRejections,
      status: finalStatus,
      reason: statusReason,
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[VoxPolis Ingestion Fatal Error]:`, err?.message || err);
    return {
      success: false,
      action: 'poll_pilot',
      countries_targeted: targetCountries,
      countries_completed: countriesCompleted,
      countries_pending: countriesPending,
      countries_failed: countriesFailed,
      duration_ms: duration,
      total_candidates_found: totalCandidatesFound,
      total_candidates_evaluated: totalCandidatesEvaluated,
      total_persisted_count: allPersisted.length,
      persisted_articles: allPersisted,
      results_by_country: resultsByCountry,
      rejection_summary: globalRejections,
      status: 'error' as any,
      reason: 'Fatal pipeline execution error',
      error: err?.message || 'Ingestion failure',
    };
  } finally {
    pilotExecutionLock = { running: false, startedAt: 0 };
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

    if (action === 'poll_pilot') {
      const countryParam = searchParams.get('country') || undefined;
      const result = await pollPilotFeeds(countryParam);
      return NextResponse.json(result);
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
