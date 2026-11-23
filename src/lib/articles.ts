import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ArticleData } from '@/lib/news';
import { decodeAllHtmlEntities } from '@/lib/news-rewriter';
import { cleanTitle, isUsablePhoto } from '@/lib/site';

/**
 * Server-side article access. Every page reads from here so the
 * HTML Google receives already contains the news.
 */

// '*' keeps this working whether or not the editorial migration has been applied.
const LIST_COLUMNS = '*';

function rowToArticle(r: any): ArticleData {
  return {
    id: r.id,
    slug: r.slug,
    title: cleanTitle(decodeAllHtmlEntities(r.title || '')),
    snippet: decodeAllHtmlEntities(r.dek || r.snippet || ''),
    content: decodeAllHtmlEntities(r.content || ''),
    ai_analysis: r.ai_analysis || '',
    country_code: r.country_code,
    language: r.language || 'en',
    category: r.category || 'politics',
    // A photo is only shown when its licence credit is stored with it.
    image_mode: isUsablePhoto(r.original_image_url, r.image_credit) ? 'original' : 'breaking_logo',
    original_image_url: isUsablePhoto(r.original_image_url, r.image_credit) ? r.original_image_url : undefined,
    image_credit: r.image_credit || undefined,
    image_alt: r.image_alt || undefined,
    is_featured: !!r.is_featured,
    featured_at: r.featured_at || undefined,
    image_license: r.image_license || undefined,
    image_page_url: r.image_page_url || undefined,
    review_status: r.review_status || 'pending',
    story_type: r.story_type || undefined,
    lead: r.lead || undefined,
    sections: Array.isArray(r.sections) ? r.sections : undefined,
    what_to_watch: r.what_to_watch || undefined,
    sources: Array.isArray(r.sources) ? r.sources : undefined,
    reviewed_at: r.reviewed_at || undefined,
    reviewed_by: r.reviewed_by || undefined,
    source_name: r.source_name,
    source_url: r.source_url,
    is_breaking: !!r.is_breaking,
    tags: (r.tags || []).filter((t: string) => typeof t === 'string' && !/^by /i.test(t)),
    author: (r.tags || []).find((t: string) => typeof t === 'string' && /^by /i.test(t))?.slice(3),
    views_count: r.views_count || 0,
    total_reading_time_seconds: r.total_reading_time_seconds || 180,
    created_at: r.created_at,
    updated_at: r.updated_at || undefined,
    dek: r.dek || undefined,
    key_points: r.key_points || undefined,
    analysis: r.analysis || undefined,
    background: r.background || undefined,
    what_next: r.what_next || undefined,
    seo_title: r.seo_title || undefined,
    meta_description: r.meta_description || undefined,
    importance: r.importance ?? undefined,
    source_published_at: r.source_published_at || undefined,
  };
}

function isPublished(r: any): boolean {
  // rows created before the migration have no status column / null status; rejected stories are never shown
  return (!r?.status || r.status === 'published') && r?.review_status !== 'rejected';
}

/** Only stories the editor approved are offered to Google (sitemaps, RSS, index). */
export function isApproved(a: { review_status?: string }): boolean {
  return a.review_status === 'approved';
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.warn('[articles] query failed', e);
    return fallback;
  }
}

export const getArticleBySlug = cache(async (slug: string): Promise<ArticleData | null> =>
  safe(async () => {
    const { data, error } = await supabaseAdmin.from('articles').select('*').eq('slug', slug).maybeSingle();
    if (error || !data) return null;
    // Draft mode: only stories the editor has published are visible to the public.
    // Archived stories still open (no broken links) but are hidden from lists, sitemaps and Google.
    if (!isPublished(data) || (data.review_status !== 'approved' && data.review_status !== 'archived')) return null;
    const article = rowToArticle(data);
    const { data: poll } = await supabaseAdmin
      .from('polls')
      .select('id, question, agree_count, disagree_count')
      .eq('article_id', data.id)
      .maybeSingle();
    if (poll?.question) article.poll = poll as any;
    return article;
  }, null)
);

export const getLatestForCountry = cache(async (code: string, limit = 40): Promise<ArticleData[]> =>
  safe(async () => {
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select(LIST_COLUMNS)
      .eq('country_code', code.toUpperCase())
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).filter(isPublished).map(rowToArticle);
  }, [] as ArticleData[])
);

/** Latest stories from every country except `excludeCode`, one list for the "Around the world" strip. */
export const getLatestWorld = cache(async (excludeCode?: string, limit = 12): Promise<ArticleData[]> =>
  safe(async () => {
    let q = supabaseAdmin.from('articles').select(LIST_COLUMNS).eq('review_status', 'approved');
    if (excludeCode) q = q.neq('country_code', excludeCode.toUpperCase());
    const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).filter(isPublished).map(rowToArticle);
  }, [] as ArticleData[])
);

const STOP = new Set('the a an and or of to in on for at by with from as is are was were be has have had says say said over after into about its his her their this that will not new how why what who'.split(' '));
const keyWords = (a: ArticleData) =>
  new Set(
    [a.title, ...(a.tags || [])]
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  );

/** Stories the editor ticked "Feature on homepage" in the last 7 days, newest pick first. */
export const getFeatured = cache(async (limit = 5): Promise<ArticleData[]> =>
  safe(async () => {
    const { data } = await supabaseAdmin
      .from('articles')
      .select(LIST_COLUMNS)
      .eq('review_status', 'approved')
      .eq('is_featured', true)
      .gte('featured_at', new Date(Date.now() - 7 * 24 * 3600_000).toISOString())
      .order('featured_at', { ascending: false })
      .limit(limit);
    return (data || []).filter(isPublished).map(rowToArticle);
  }, [])
);

/** Related stories: same section, most shared key words (title and tags) first, stories with a photo preferred, then newest. */
export const getRelated = cache(async (article: ArticleData, limit = 4): Promise<ArticleData[]> => {
  const list = (await getLatestForCountry(article.country_code, 40)).filter((a) => a.slug !== article.slug);
  const mine = keyWords(article);
  return list
    .map((a, i) => {
      let shared = 0;
      keyWords(a).forEach((w) => mine.has(w) && shared++);
      return { a, score: shared * 10 + (a.original_image_url ? 5 : 0) - i * 0.1 };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.a);
});

export async function getSitemapEntries(limit = 5000): Promise<{ slug: string; country_code: string; created_at: string; updated_at?: string; title: string }[]> {
  return safe(async () => {
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('slug, country_code, created_at, updated_at, title')
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).filter(isPublished).map((r: any) => ({ slug: r.slug, country_code: r.country_code, created_at: r.created_at, updated_at: r.updated_at || undefined, title: cleanTitle(r.title) }));
  }, []);
}

export async function getCountriesWithArticles(): Promise<{ code: string; latest: string }[]> {
  return safe(async () => {
    const { data } = await supabaseAdmin.from('articles').select('country_code, created_at')
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(3000);
    const seen = new Map<string, string>();
    (data || []).forEach((r: any) => {
      if (!seen.has(r.country_code)) seen.set(r.country_code, r.created_at);
    });
    return Array.from(seen, ([code, latest]) => ({ code, latest }));
  }, []);
}

/** Latest approved stories (RSS feed). */
export async function getLatestApproved(limit = 50): Promise<ArticleData[]> {
  return safe(async () => {
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select(LIST_COLUMNS)
      .eq('review_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).filter(isPublished).map(rowToArticle);
  }, [] as ArticleData[]);
}

/** A published story that used to live at another address (for 301 redirects). */
export async function getArticleByPreviousSlug(slug: string): Promise<ArticleData | null> {
  return safe(async () => {
    const { data } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('previous_slug', slug)
      .eq('review_status', 'approved')
      .maybeSingle();
    return data && isPublished(data) ? rowToArticle(data) : null;
  }, null);
}
