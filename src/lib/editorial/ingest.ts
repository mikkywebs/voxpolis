import { supabaseAdmin } from '@/lib/supabase/admin';
import { CoverageDesk } from '@/config/coverage';
import { getCountryByCode } from '@/config/countries';
import { generateUniqueSlug } from '@/lib/pipeline/slug';
import { readFeeds, looksPolitical, titleTokens, similarity, FeedItem } from './feeds';
import { extractSourceArticle } from './extract';
import { writeVoxpolisArticle, checkPiece, EditorialPiece } from './writer';

/**
 * One ingest run for one desk:
 * read feeds → drop seen/old/non-political → rank by how many outlets carry the story
 * → read source → write original Voxpolis article → quality gates → save → log.
 */

const MAX_AGE_HOURS = Number(process.env.INGEST_MAX_AGE_HOURS || 36);
const MIN_IMPORTANCE = Number(process.env.INGEST_MIN_IMPORTANCE || 4);
const RETRY_AFTER_HOURS = 72;

export interface IngestOutcome {
  url: string;
  source: string;
  outcome: 'published' | 'skipped' | 'rejected' | 'error';
  reason?: string;
  slug?: string;
  country?: string;
}

export interface IngestReport {
  desk: string;
  feedsRead: number;
  feedErrors: { feed: string; error: string }[];
  itemsSeen: number;
  candidates: number;
  published: number;
  outcomes: IngestOutcome[];
  durationMs: number;
}

async function log(desk: string, o: IngestOutcome, durationMs: number) {
  try {
    await supabaseAdmin.from('ingest_log').insert({
      country_code: o.country || desk,
      source_url: o.url,
      source_name: o.source,
      outcome: o.outcome,
      reason: o.reason?.slice(0, 500),
      article_slug: o.slug,
      duration_ms: durationMs,
    });
  } catch {
    /* log table missing is not fatal */
  }
}

/** Rank: stories carried by several outlets first, then newest. */
function rankCandidates(items: FeedItem[]): FeedItem[] {
  const tokens = items.map((i) => titleTokens(i.title));
  const scored = items.map((item, i) => {
    let coverage = 0;
    for (let j = 0; j < items.length; j++) {
      if (i !== j && items[j].sourceName !== item.sourceName && similarity(tokens[i], tokens[j]) >= 0.5) coverage++;
    }
    return { item, coverage, t: new Date(item.publishedAt).getTime() };
  });
  scored.sort((a, b) => b.coverage - a.coverage || b.t - a.t);

  // keep only one item per story cluster
  const kept: { item: FeedItem; tok: Set<string> }[] = [];
  for (const s of scored) {
    const tok = titleTokens(s.item.title);
    if (kept.some((k) => similarity(k.tok, tok) >= 0.6)) continue;
    kept.push({ item: s.item, tok });
  }
  return kept.map((k) => k.item);
}

async function alreadyHandled(urls: string[]): Promise<Set<string>> {
  const handled = new Set<string>();
  if (urls.length === 0) return handled;
  const { data: arts } = await supabaseAdmin.from('articles').select('source_url').in('source_url', urls);
  arts?.forEach((r: any) => handled.add(r.source_url));
  try {
    const since = new Date(Date.now() - RETRY_AFTER_HOURS * 3600_000).toISOString();
    const { data: logs } = await supabaseAdmin
      .from('ingest_log')
      .select('source_url')
      .in('source_url', urls)
      .in('outcome', ['rejected', 'published'])
      .gte('created_at', since);
    logs?.forEach((r: any) => r.source_url && handled.add(r.source_url));
  } catch {}
  return handled;
}

async function isDuplicateOfRecent(country: string, headline: string, sourceTitle: string): Promise<string | null> {
  const since = new Date(Date.now() - 4 * 86400_000).toISOString();
  const { data } = await supabaseAdmin
    .from('articles')
    .select('slug, title')
    .eq('country_code', country)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(80);
  const a = titleTokens(headline);
  const b = titleTokens(sourceTitle);
  for (const row of data || []) {
    const t = titleTokens(row.title || '');
    if (similarity(a, t) >= 0.6 || similarity(b, t) >= 0.6) return row.slug;
  }
  return null;
}

async function saveArticle(piece: EditorialPiece, item: FeedItem, src: { finalUrl: string; imageUrl?: string; author?: string; publishedAt?: string }) {
  const country = getCountryByCode(piece.country_iso);
  const slug = generateUniqueSlug(piece.slug_keywords || piece.headline, item.url, src.publishedAt || item.publishedAt);
  const content = piece.body.join('\n\n');
  const wordCount = [content, ...piece.analysis, piece.background, piece.what_next].join(' ').split(/\s+/).filter(Boolean).length;
  const tags = Array.from(new Set([...piece.tags, country.name, 'Politics']));

  const legacy = {
    slug,
    title: piece.headline,
    snippet: piece.dek,
    content,
    ai_analysis: piece.analysis.join('\n\n'),
    country_code: country.code,
    language: 'en',
    category: 'politics',
    image_mode: src.imageUrl ? 'original' : 'breaking_logo',
    original_image_url: src.imageUrl || null,
    source_name: item.sourceName,
    source_url: item.url,
    is_breaking: piece.importance >= 9,
    tags,
    views_count: 0,
    total_reading_time_seconds: Math.max(120, Math.round((wordCount / 220) * 60)),
    created_at: new Date().toISOString(),
  };
  const extended = {
    ...legacy,
    dek: piece.dek,
    key_points: piece.key_points,
    analysis: piece.analysis.join('\n\n'),
    background: piece.background,
    what_next: piece.what_next,
    seo_title: piece.seo_title,
    meta_description: piece.meta_description,
    importance: piece.importance,
    actors: piece.actors,
    source_published_at: src.publishedAt || item.publishedAt,
    word_count: wordCount,
    editorial_version: 2,
    status: 'published',
  };

  let { data, error } = await supabaseAdmin.from('articles').insert(extended).select('id, slug').single();
  if (error && /column/i.test(error.message)) {
    // Migration not applied yet: save the core article anyway.
    ({ data, error } = await supabaseAdmin.from('articles').insert(legacy).select('id, slug').single());
  }
  if (error || !data) throw new Error(error?.message || 'insert failed');

  if (piece.question) {
    await supabaseAdmin
      .from('polls')
      .insert({ article_id: data.id, question: piece.question, agree_count: 0, disagree_count: 0 })
      .then(() => undefined, () => undefined);
  }
  return data.slug as string;
}

async function processItem(desk: CoverageDesk, item: FeedItem): Promise<IngestOutcome> {
  const base = { url: item.url, source: item.sourceName };
  const src = await extractSourceArticle(item.url, item.title);
  if (!src.ok) return { ...base, outcome: 'rejected', reason: `source: ${src.reason}` };

  let piece: EditorialPiece;
  try {
    piece = await writeVoxpolisArticle({
      sourceTitle: src.title || item.title,
      sourceText: src.text,
      sourceName: item.sourceName,
      publishedAt: src.publishedAt || item.publishedAt,
      deskCountry: desk.code,
    });
  } catch (e: any) {
    return { ...base, outcome: 'error', reason: `writer: ${e?.message || e}` };
  }

  const problems = checkPiece(piece, src.title || item.title, src.text, MIN_IMPORTANCE);
  if (problems.length) return { ...base, outcome: 'rejected', reason: problems.join('; '), country: piece.country_iso };

  const dup = await isDuplicateOfRecent(piece.country_iso, piece.headline, item.title);
  if (dup) return { ...base, outcome: 'skipped', reason: `same story as /news/${dup}`, country: piece.country_iso };

  try {
    const slug = await saveArticle(piece, item, src);
    return { ...base, outcome: 'published', slug, country: piece.country_iso, reason: piece.provider };
  } catch (e: any) {
    return { ...base, outcome: 'error', reason: `save: ${e?.message || e}`, country: piece.country_iso };
  }
}

export async function runDesk(desk: CoverageDesk, opts: { max?: number; deadlineMs?: number } = {}): Promise<IngestReport> {
  const started = Date.now();
  const deadline = started + (opts.deadlineMs ?? 50_000);
  const max = opts.max ?? desk.maxPerRun;

  const { items, errors } = await readFeeds(desk.feeds);
  const cutoff = Date.now() - MAX_AGE_HOURS * 3600_000;
  const fresh = items.filter((i) => new Date(i.publishedAt).getTime() >= cutoff && !/news\.google\.com/.test(i.url) && looksPolitical(i));
  const handled = await alreadyHandled(fresh.map((i) => i.url));
  const ranked = rankCandidates(fresh.filter((i) => !handled.has(i.url)));

  const outcomes: IngestOutcome[] = [];
  let published = 0;
  // Try up to 2x the target in parallel batches, so a few rejections don't leave the desk empty.
  const pool = ranked.slice(0, max * 2);
  for (let i = 0; i < pool.length && published < max; i += max) {
    if (Date.now() > deadline - 30_000) break; // not enough time for another AI round
    const batch = pool.slice(i, i + (max - published));
    const results = await Promise.all(
      batch.map(async (item) => {
        const t0 = Date.now();
        const o = await processItem(desk, item);
        await log(desk.code, o, Date.now() - t0);
        return o;
      })
    );
    outcomes.push(...results);
    published += results.filter((r) => r.outcome === 'published').length;
  }

  return {
    desk: desk.code,
    feedsRead: desk.feeds.length,
    feedErrors: errors,
    itemsSeen: items.length,
    candidates: ranked.length,
    published,
    outcomes,
    durationMs: Date.now() - started,
  };
}
