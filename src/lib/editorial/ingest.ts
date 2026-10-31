import { supabaseAdmin } from '@/lib/supabase/admin';
import { CoverageDesk } from '@/config/coverage';
import { getCountryByCode } from '@/config/countries';
import { toSlug, RESERVED_SLUGS } from '@/lib/paths';
import { readFeeds, looksPolitical, titleTokens, similarity, companionsFor, FeedItem } from './feeds';
import { extractSourceArticle } from './extract';
import { writeVoxpolisArticle, checkPiece, EditorialPiece, SourceInput } from './writer';
import { findLicensedPhoto, LicensedPhoto } from './photos';

/**
 * One ingest run for one desk:
 * read feeds → drop seen/old/non-political → rank by how many outlets carry the story
 * → read source → write original Voxpolis article → quality gates → save → log.
 */

const MAX_AGE_HOURS = Number(process.env.INGEST_MAX_AGE_HOURS || 36);
// Only significant stories (6+ = significant national story). Change with INGEST_MIN_IMPORTANCE.
const MIN_IMPORTANCE = Number(process.env.INGEST_MIN_IMPORTANCE || 6);
const RETRY_AFTER_HOURS = 72;
// Time budget inside one 60s serverless call: feeds ≤8s, reading articles ≤12s, AI writing ≤34s.
const EXTRACT_BUDGET_MS = 12_000;
const AI_BUDGET_MS = 34_000;
const PHOTO_BUDGET_MS = 4_000;

export interface IngestOutcome {
  url: string;
  source: string;
  outcome: 'published' | 'skipped' | 'rejected' | 'error' | 'merged';
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
      .in('outcome', ['rejected', 'published', 'merged'])
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

/** Short, readable, unique web address part, e.g. "peter-obi-tinubu-campaign-2027". */
async function uniqueSlug(base: string): Promise<string> {
  let root = toSlug(base, 60) || 'political-update';
  if (RESERVED_SLUGS.has(root) || root.length < 8) root = `${root}-update`;
  for (let n = 1; n <= 20; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const { data } = await supabaseAdmin
      .from('articles')
      .select('id')
      .or(`slug.eq.${candidate},previous_slug.eq.${candidate}`)
      .limit(1);
    if (!data || data.length === 0) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

interface UsedSource {
  item: FeedItem;
  src: Extracted;
}

async function saveArticle(piece: EditorialPiece, used: UsedSource[], photo: LicensedPhoto | null) {
  const primary = used[0];
  const country = getCountryByCode(piece.country_iso);
  const slug = await uniqueSlug(piece.slug_keywords || piece.headline);
  const content = piece.body.join('\n\n');
  const wordCount = [content, ...piece.analysis, piece.what_to_watch || ''].join(' ').split(/\s+/).filter(Boolean).length;
  const tags = Array.from(new Set([...piece.tags, country.name, 'Politics']));
  const sources = used.map((u) => ({ name: u.item.sourceName, url: u.item.url }));

  const row = {
    slug,
    title: piece.headline,
    snippet: piece.dek,
    content,
    ai_analysis: piece.analysis.join('\n\n'),
    country_code: country.code,
    language: 'en',
    category: 'politics',
    // Only licensed (Wikimedia Commons) photos. Publisher photos are never stored.
    image_mode: photo ? 'original' : 'breaking_logo',
    original_image_url: photo?.url || null,
    source_name: primary.item.sourceName,
    source_url: primary.item.url,
    is_breaking: piece.importance >= 9,
    tags,
    views_count: 0,
    total_reading_time_seconds: Math.max(120, Math.round((wordCount / 220) * 60)),
    created_at: new Date().toISOString(),
    dek: piece.dek,
    key_points: piece.key_points,
    analysis: piece.analysis.join('\n\n'),
    what_next: piece.what_to_watch,
    seo_title: piece.seo_title,
    meta_description: piece.meta_description,
    importance: piece.importance,
    actors: piece.actors,
    source_published_at: primary.src.publishedAt || primary.item.publishedAt,
    word_count: wordCount,
    editorial_version: 3,
    status: 'published',
    image_credit: photo?.credit || null,
    image_license: photo?.license || null,
    image_page_url: photo?.pageUrl || null,
    // Flexible structure (v3)
    story_type: piece.story_type,
    lead: piece.lead.join('\n\n'),
    sections: piece.sections,
    what_to_watch: piece.what_to_watch,
    sources,
  };

  const { data, error } = await supabaseAdmin.from('articles').insert(row).select('id, slug').single();
  if (error || !data) throw new Error(error?.message || 'insert failed');

  if (piece.question) {
    await supabaseAdmin
      .from('polls')
      .insert({ article_id: data.id, question: piece.question, agree_count: 0, disagree_count: 0 })
      .then(() => undefined, () => undefined);
  }
  return data.slug as string;
}

type Extracted = Awaited<ReturnType<typeof extractSourceArticle>>;

async function writeAndSave(desk: CoverageDesk, used: UsedSource[]): Promise<IngestOutcome> {
  const primary = used[0];
  const base = { url: primary.item.url, source: used.map((u) => u.item.sourceName).join(' + ') };
  const sources: SourceInput[] = used.map((u) => ({
    name: u.item.sourceName,
    url: u.item.url,
    title: u.src.title || u.item.title,
    text: u.src.text,
    publishedAt: u.src.publishedAt || u.item.publishedAt,
  }));

  let piece: EditorialPiece;
  try {
    piece = await writeVoxpolisArticle({ sources, deskCountry: desk.code });
  } catch (e: any) {
    return { ...base, outcome: 'error', reason: `writer: ${e?.message || e}` };
  }

  const problems = checkPiece(piece, sources, MIN_IMPORTANCE);
  if (problems.length) return { ...base, outcome: 'rejected', reason: problems.join('; '), country: piece.country_iso };

  const dup = await isDuplicateOfRecent(piece.country_iso, piece.headline, primary.item.title);
  if (dup) return { ...base, outcome: 'skipped', reason: `same story as ${dup}`, country: piece.country_iso };

  const photo = await findLicensedPhoto(
    [...piece.image_subjects, ...piece.actors.slice(0, 2)],
    PHOTO_BUDGET_MS,
    undefined,
    getCountryByCode(piece.country_iso).name
  );

  try {
    const slug = await saveArticle(piece, used, photo);
    return { ...base, outcome: 'published', slug, country: piece.country_iso, reason: `${used.length} source(s) · ${piece.story_type} · ${piece.provider}` };
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
  const record = async (o: IngestOutcome, t0: number) => {
    outcomes.push(o);
    await log(desk.code, o, Date.now() - t0);
  };

  // Step 1: pick candidate stories and the other outlets covering each; read them all in parallel (cheap).
  const pool = ranked.slice(0, Math.max(5, max * 3));
  const groups = pool.map((p) => [p, ...companionsFor(p, fresh)]);
  const urls = Array.from(new Set(groups.flat().map((i) => i.url)));
  const t0 = Date.now();
  const timeUp: Extracted = { ok: false, reason: 'timed out', finalUrl: '', title: '', text: '', wordCount: 0 };
  const results = await Promise.all(
    urls.map((u) =>
      Promise.race([
        extractSourceArticle(u, ''),
        new Promise<Extracted>((resolve) => setTimeout(() => resolve(timeUp), EXTRACT_BUDGET_MS)),
      ])
    )
  );
  const byUrl = new Map(urls.map((u, i) => [u, results[i]]));

  const ready: UsedSource[][] = [];
  const usedUrls = new Set<string>();
  for (const group of groups) {
    const [primary, ...rest] = group;
    if (usedUrls.has(primary.url)) continue;
    const ps = byUrl.get(primary.url)!;
    if (!ps.ok) {
      await record({ url: primary.url, source: primary.sourceName, outcome: 'rejected', reason: `source: ${ps.reason}` }, t0);
      continue;
    }
    const used: UsedSource[] = [{ item: primary, src: ps }];
    for (const c of rest) {
      const cs = byUrl.get(c.url);
      if (cs?.ok && !usedUrls.has(c.url)) used.push({ item: c, src: cs });
    }
    used.forEach((u) => usedUrls.add(u.item.url));
    ready.push(used);
  }

  // Step 2: write the best stories with AI, in parallel rounds, until the target or the time budget is reached.
  let published = 0;
  let next = 0;
  while (published < max && next < ready.length && Date.now() < deadline - AI_BUDGET_MS) {
    const batch = ready.slice(next, next + (max - published));
    next += batch.length;
    const t1 = Date.now();
    const done = await Promise.all(batch.map((used) => writeAndSave(desk, used)));
    for (let i = 0; i < done.length; i++) {
      await record(done[i], t1);
      // Supporting reports are marked as used so they don't become separate stories.
      if (done[i].outcome === 'published') {
        for (const u of batch[i].slice(1)) {
          await record({ url: u.item.url, source: u.item.sourceName, outcome: 'merged', reason: `used in ${done[i].slug}`, country: done[i].country }, t1);
        }
      }
    }
    published += done.filter((r) => r.outcome === 'published').length;
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
