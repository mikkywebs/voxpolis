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
    image_license: r.image_license || undefined,
    image_page_url: r.image_page_url || undefined,
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
  // rows created before the migration have no status column / null status
  return !r?.status || r.status === 'published';
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
    if (!isPublished(data)) return null;
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
    const { data, error } = await supabaseAdmin.from('articles').select(LIST_COLUMNS).eq('country_code', code.toUpperCase())
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).filter(isPublished).map(rowToArticle);
  }, [] as ArticleData[])
);

/** Latest stories from every country except `excludeCode`, one list for the "Around the world" strip. */
export const getLatestWorld = cache(async (excludeCode?: string, limit = 12): Promise<ArticleData[]> =>
  safe(async () => {
    let q = supabaseAdmin.from('articles').select(LIST_COLUMNS);
    if (excludeCode) q = q.neq('country_code', excludeCode.toUpperCase());
    const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data || []).filter(isPublished).map(rowToArticle);
  }, [] as ArticleData[])
);

export const getRelated = cache(async (article: ArticleData, limit = 4): Promise<ArticleData[]> => {
  const list = await getLatestForCountry(article.country_code, limit + 6);
  return list.filter((a) => a.slug !== article.slug).slice(0, limit);
});

export async function getSitemapEntries(limit = 5000): Promise<{ slug: string; country_code: string; created_at: string; updated_at?: string; title: string }[]> {
  return safe(async () => {
    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('slug, country_code, created_at, updated_at, title')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).filter(isPublished).map((r: any) => ({ slug: r.slug, country_code: r.country_code, created_at: r.created_at, updated_at: r.updated_at || undefined, title: cleanTitle(r.title) }));
  }, []);
}

export async function getCountriesWithArticles(): Promise<{ code: string; latest: string }[]> {
  return safe(async () => {
    const { data } = await supabaseAdmin.from('articles').select('country_code, created_at')
      .order('created_at', { ascending: false })
      .limit(3000);
    const seen = new Map<string, string>();
    (data || []).forEach((r: any) => {
      if (!seen.has(r.country_code)) seen.set(r.country_code, r.created_at);
    });
    return Array.from(seen, ([code, latest]) => ({ code, latest }));
  }, []);
}
