import { supabaseAdmin } from '@/lib/supabase/admin';
import { CoverageDesk } from '@/config/coverage';
import { getCountryByCode } from '@/config/countries';
import { toSlug, RESERVED_SLUGS } from '@/lib/paths';
import { readFeeds, looksPolitical, titleTokens, similarity, companionsFor, FeedItem } from './feeds';
import { extractSourceArticle } from './extract';
import { writeVoxpolisArticle, checkPiece, repairCopiedWording, EditorialPiece, SourceInput } from './writer';
import { extractFacts, numbersIn, namesIn } from './facts';
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
  note?: string;
}

async function log(desk: string, o: IngestOutcome, durationMs: number) {
  try {
    await supabaseAdmin.from('ingest_log').insert({
      country_code: o.country || desk,
      desk,
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

const DAILY_TOTAL_CAP = Number(process.env.INGEST_DAILY_CAP || 40);

/**
 * How many new drafts this desk may still make right now.
 * Daily caps are paced across the day (UTC) so drafts arrive steadily, not all in the morning.
 */
async function remainingToday(desk: CoverageDesk): Promise<{ allowed: number; note: string }> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const since = dayStart.toISOString();
  const [{ count: deskCount }, { count: totalCount }] = await Promise.all([
    supabaseAdmin.from('ingest_log').select('id', { count: 'exact', head: true }).eq('desk', desk.code).eq('outcome', 'published').gte('created_at', since),
    supabaseAdmin.from('ingest_log').select('id', { count: 'exact', head: true }).eq('outcome', 'published').gte('created_at', since),
  ]);
  const hour = new Date().getUTCHours();
  const pacedDesk = Math.ceil((desk.dailyCap * (hour + 1)) / 24);
  const pacedTotal = Math.ceil((DAILY_TOTAL_CAP * (hour + 1)) / 24);
  const allowed = Math.max(0, Math.min(pacedDesk - (deskCount || 0), pacedTotal - (totalCount || 0), desk.dailyCap - (deskCount || 0), DAILY_TOTAL_CAP - (totalCount || 0)));
  return { allowed, note: `today: desk ${deskCount || 0}/${desk.dailyCap}, all desks ${totalCount || 0}/${DAILY_TOTAL_CAP}` };
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

// ---- Same event, different outlet: one draft, not two ----

/** Words reduced to a rough stem so "protest", "protests" and "protesters" match. */
function stems(text: string): Set<string> {
  const out = new Set<string>();
  titleTokens(text).forEach((w) => {
    let x = w;
    for (const end of ['ations', 'ation', 'ings', 'ing', 'ers', 'er', 'ies', 'es', 'ed', 's']) {
      if (x.length > end.length + 3 && x.endsWith(end)) {
        x = x.slice(0, -end.length);
        break;
      }
    }
    out.add(x);
  });
  return out;
}

function overlap(a: Set<string>, b: Set<string>) {
  let n = 0;
  a.forEach((w) => b.has(w) && n++);
  return n;
}

/** Specific figures (not years or small counts): the strongest sign two reports describe the same event. */
function keyNumbers(text: string) {
  return new Set(numbersIn(text).filter((n) => Number(n) > 10 && !(/^\d{4}$/.test(n) && Number(n) >= 1900 && Number(n) <= 2100)));
}

/**
 * Same event if: they share a specific figure and enough words, or two named people/bodies and enough words,
 * or most of their words. Tested on real drafts: joins two outlets' reports of the same protest,
 * keeps apart different stories about the same institution (e.g. two separate INEC stories).
 */
function sameEvent(a: string, b: string): number {
  const sa = stems(a);
  const sb = stems(b);
  const shared = overlap(sa, sb);
  const words = shared < 4 ? 0 : shared / Math.min(sa.size, sb.size);
  const nums = overlap(keyNumbers(a), keyNumbers(b));
  const names = overlap(new Set(namesIn(a).map((n) => n.toLowerCase())), new Set(namesIn(b).map((n) => n.toLowerCase())));
  if ((nums >= 1 && words >= 0.25) || (names >= 2 && words >= 0.3) || words >= 0.55) return words + nums + names;
  return 0;
}

interface SameEvent {
  id: string;
  slug: string;
  review_status: string;
  touched: boolean;
  sources: { name: string; url: string }[];
}

/** A draft or story from the last 36 hours, same country, about the same event. */
async function findSameEvent(country: string, text: string): Promise<SameEvent | null> {
  const since = new Date(Date.now() - 36 * 3600_000).toISOString();
  const { data } = await supabaseAdmin
    .from('articles')
    .select('id, slug, title, dek, key_points, lead, review_status, created_at, updated_at, checked_items, sources, source_url, source_name')
    .eq('country_code', country)
    .in('review_status', ['pending', 'approved'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(60);
  let best: any = null;
  let bestScore = 0;
  for (const row of data || []) {
    const score = sameEvent(text, [row.title, row.dek, ...(row.key_points || []), row.lead].filter(Boolean).join('. '));
    if (score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  if (!best || bestScore <= 0) return null;
  const edited = best.updated_at && new Date(best.updated_at).getTime() - new Date(best.created_at).getTime() > 60_000;
  return {
    id: best.id,
    slug: best.slug,
    review_status: best.review_status,
    touched: best.review_status !== 'pending' || !!edited || (best.checked_items || []).length > 0,
    sources: best.sources?.length ? best.sources : [{ name: best.source_name, url: best.source_url }],
  };
}

// Stories written in parallel are saved one at a time, so two outlets' reports of the same event
// can't both become drafts in the same run.
let saveChain: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(fn: () => Promise<T>): Promise<T> {
  const run = saveChain.then(fn, fn);
  saveChain = run.catch(() => undefined);
  return run;
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

/** Private copy of the reports (server only), so a later report of the same event can be merged in. */
async function storeSourceTexts(articleId: string, used: UsedSource[] | SourceInput[]) {
  const sources = (used as any[]).map((u) =>
    'item' in u
      ? { name: u.item.sourceName, url: u.item.url, title: u.src.title || u.item.title, text: u.src.text, publishedAt: u.src.publishedAt || u.item.publishedAt }
      : u
  );
  await supabaseAdmin
    .from('article_source_texts')
    .upsert({ article_id: articleId, sources, updated_at: new Date().toISOString() })
    .then(() => undefined, () => undefined);
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
    // Facts found in the original reports, for the editor's pre-publish check.
    source_facts: extractFacts(used.map((u) => `${u.src.title}\n${u.src.text}`).join('\n')),
  };

  const { data, error } = await supabaseAdmin.from('articles').insert(row).select('id, slug').single();
  if (error || !data) throw new Error(error?.message || 'insert failed');
  await storeSourceTexts(data.id, used);

  if (piece.question) {
    await supabaseAdmin
      .from('polls')
      .insert({ article_id: data.id, question: piece.question, agree_count: 0, disagree_count: 0 })
      .then(() => undefined, () => undefined);
  }
  return data.slug as string;
}

type Extracted = Awaited<ReturnType<typeof extractSourceArticle>>;

async function writeAndSave(desk: CoverageDesk, used: UsedSource[], deadline: number): Promise<IngestOutcome> {
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

  let problems = checkPiece(piece, sources, MIN_IMPORTANCE);
  // One repair pass: if the only problem is copied wording, rewrite just those sentences and check again.
  if (problems.length && problems.every((p) => p.startsWith('copied wording'))) {
    try {
      piece = await repairCopiedWording(piece, sources);
      problems = checkPiece(piece, sources, MIN_IMPORTANCE);
      if (!problems.length) piece.provider = `${piece.provider} · repaired copied wording`;
    } catch (e: any) {
      problems.push(`repair failed: ${e?.message || e}`);
    }
  }
  if (problems.length) return { ...base, outcome: 'rejected', reason: problems.join('; '), country: piece.country_iso };

  const eventText = [piece.headline, piece.dek, ...piece.key_points, piece.lead.join(' ')].join('. ');
  // Quick look before the photo search; the decisive check happens inside the save queue.
  const early = await findSameEvent(piece.country_iso, eventText);
  const photo = early
    ? null
    : await findLicensedPhoto([...piece.image_subjects, ...piece.actors.slice(0, 2)], PHOTO_BUDGET_MS, undefined, getCountryByCode(piece.country_iso).name);

  const decision = await oneAtATime(async () => {
    const same = early || (await findSameEvent(piece.country_iso, eventText));
    if (same) return { same } as const;
    try {
      const slug = await saveArticle(piece, used, photo);
      return { slug } as const;
    } catch (e: any) {
      return { error: String(e?.message || e) } as const;
    }
  });

  if ('error' in decision) return { ...base, outcome: 'error', reason: `save: ${decision.error}`, country: piece.country_iso };
  if ('slug' in decision) return { ...base, outcome: 'published', slug: decision.slug, country: piece.country_iso, reason: `${used.length} source(s) · ${piece.story_type} · ${piece.provider}` };
  return mergeIntoExisting(decision.same, used, sources, piece.country_iso, base, deadline);
}

/**
 * Another outlet reported an event we already have a draft for.
 * - Draft not yet touched by the editor: rewrite it once with all the reports together (same address, same photo).
 * - Draft edited or already published: keep the editor's work, add the new outlet under Sources and flag it.
 */
async function mergeIntoExisting(
  same: SameEvent,
  used: UsedSource[],
  newSources: SourceInput[],
  country: string,
  base: { url: string; source: string },
  deadline: number
): Promise<IngestOutcome> {
  const known = new Set(same.sources.map((x) => x.url));
  const extra = newSources.filter((x) => !known.has(x.url));
  if (!extra.length) return { ...base, outcome: 'skipped', reason: `already in ${same.slug}`, country };
  const allLinks = [...same.sources, ...extra.map((x) => ({ name: x.name, url: x.url }))].slice(0, 8);

  if (!same.touched && Date.now() < deadline - 30_000) {
    const { data: stored } = await supabaseAdmin.from('article_source_texts').select('sources').eq('article_id', same.id).maybeSingle();
    const before: SourceInput[] = (stored?.sources as SourceInput[]) || [];
    if (before.length) {
      const combined = [...before, ...extra].slice(0, 4);
      try {
        const piece = await writeVoxpolisArticle({ sources: combined, deskCountry: country });
        const problems = checkPiece(piece, combined, MIN_IMPORTANCE);
        if (!problems.length) {
          const content = piece.body.join('\n\n');
          const { error } = await supabaseAdmin
            .from('articles')
            .update({
              title: piece.headline,
              snippet: piece.dek,
              dek: piece.dek,
              content,
              analysis: piece.analysis.join('\n\n'),
              ai_analysis: piece.analysis.join('\n\n'),
              key_points: piece.key_points,
              lead: piece.lead.join('\n\n'),
              sections: piece.sections,
              what_to_watch: piece.what_to_watch,
              what_next: piece.what_to_watch,
              story_type: piece.story_type,
              seo_title: piece.seo_title,
              meta_description: piece.meta_description,
              importance: Math.max(piece.importance, 0),
              sources: allLinks,
              source_facts: extractFacts(combined.map((x) => `${x.title}\n${x.text}`).join('\n')),
              word_count: [content, ...piece.analysis].join(' ').split(/\s+/).filter(Boolean).length,
            })
            .eq('id', same.id)
            .eq('review_status', 'pending');
          if (!error) {
            await storeSourceTexts(same.id, combined);
            return { ...base, outcome: 'merged', slug: same.slug, country, reason: `rewritten with ${combined.length} reports: ${same.slug}` };
          }
        }
      } catch {
        // fall through to adding the link only
      }
    }
  }

  await supabaseAdmin.from('articles').update({ sources: allLinks, new_reports_at: new Date().toISOString() }).eq('id', same.id);
  return { ...base, outcome: 'merged', slug: same.slug, country, reason: `added as extra source to ${same.slug}` };
}

export async function runDesk(desk: CoverageDesk, opts: { max?: number; deadlineMs?: number } = {}): Promise<IngestReport> {
  const started = Date.now();
  const deadline = started + (opts.deadlineMs ?? 50_000);
  const quota = await remainingToday(desk);
  const max = Math.min(opts.max ?? desk.maxPerRun, quota.allowed);
  if (max <= 0) {
    return { desk: desk.code, feedsRead: 0, feedErrors: [], itemsSeen: 0, candidates: 0, published: 0, outcomes: [], durationMs: Date.now() - started, note: `daily limit reached (${quota.note})` } as IngestReport;
  }

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
    const done = await Promise.all(batch.map((used) => writeAndSave(desk, used, deadline)));
    for (let i = 0; i < done.length; i++) {
      await record(done[i], t1);
      // Supporting reports are marked as used so they don't become separate stories.
      if (done[i].outcome === 'published' || done[i].outcome === 'merged') {
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
