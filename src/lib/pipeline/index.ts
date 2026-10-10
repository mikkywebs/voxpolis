import { fetchAndExtractSourcePage } from './extractor';
import { rewriteWithAI } from './ai';
import { validateQualityGates } from './gates';
import { generateUniqueSlug } from './slug';
import { PipelineArticleRecord, AIRewritePayload } from './types';

// In-Memory Storage maps for Source URLs and Unique Slugs
const articlesBySourceUrl = new Map<string, PipelineArticleRecord>();
const articlesBySlug = new Map<string, PipelineArticleRecord>();

export function getPipelineArticleBySlug(slug: string): PipelineArticleRecord | undefined {
  return articlesBySlug.get(slug);
}

export function getPipelineArticleBySourceUrl(sourceUrl: string): PipelineArticleRecord | undefined {
  return articlesBySourceUrl.get(sourceUrl);
}

export function getAllPublishedPipelineArticles(): PipelineArticleRecord[] {
  return Array.from(articlesBySlug.values()).filter((a) => a.status === 'published');
}

export async function processSourceUrlThroughPipeline(
  sourceUrl: string,
  sourceName: string = 'Press Outlet',
  rssHeadline: string = '',
  rssDescription: string = '',
  rssDate?: string,
  countryIso: string = 'NG',
  forceReprocess: boolean = false
): Promise<PipelineArticleRecord> {
  const normUrl = sourceUrl.trim();

  // 1. DISCOVER: Check if source_url already processed (One source URL = one Voxpolis article worldwide)
  if (!forceReprocess && articlesBySourceUrl.has(normUrl)) {
    const existing = articlesBySourceUrl.get(normUrl)!;
    if (existing.status === 'published') {
      return existing;
    }
  }

  // 2. FETCH: Scrape full source HTML & clean body
  const scraped = await fetchAndExtractSourcePage(normUrl, sourceName, rssHeadline, rssDescription, rssDate);

  if (!scraped.is_valid) {
    const incompleteRecord: PipelineArticleRecord = {
      id: `pipeline-inc-${Date.now()}`,
      slug: `incomplete-${Date.now()}`,
      source_url: normUrl,
      source_name: sourceName,
      source_published_at: scraped.source_published_at,
      content_type: 'single_story',
      headline: rssHeadline || 'Incomplete Source Report',
      dek: '',
      body_markdown: '',
      executive_summary: '',
      fact_analysis: [],
      why_it_matters: '',
      legislative_scope: null,
      items: [],
      actors: [],
      tags: [],
      country_code: countryIso,
      language: 'en',
      category: 'politics',
      word_count: 0,
      read_minutes: 0,
      created_at: new Date().toISOString(),
      status: 'incomplete',
      incomplete_reason: scraped.reject_reason,
    };

    articlesBySourceUrl.set(normUrl, incompleteRecord);
    return incompleteRecord;
  }

  // 3. CLASSIFY & REWRITE: Multi-Model AI Engine (Gemini Primary, Kimi, DeepSeek)
  let rewritePayload: AIRewritePayload;
  try {
    rewritePayload = await rewriteWithAI(scraped, countryIso);
  } catch (err: any) {
    const failedRecord: PipelineArticleRecord = {
      id: `pipeline-err-${Date.now()}`,
      slug: `error-${Date.now()}`,
      source_url: normUrl,
      source_name: sourceName,
      source_published_at: scraped.source_published_at,
      content_type: 'single_story',
      headline: rssHeadline || 'Rewrite Failed',
      dek: '',
      body_markdown: '',
      executive_summary: '',
      fact_analysis: [],
      why_it_matters: '',
      legislative_scope: null,
      items: [],
      actors: [],
      tags: [],
      country_code: countryIso,
      language: 'en',
      category: 'politics',
      word_count: 0,
      read_minutes: 0,
      created_at: new Date().toISOString(),
      status: 'rejected',
      incomplete_reason: `AI rewrite execution failed: ${err?.message || err}`,
    };
    articlesBySourceUrl.set(normUrl, failedRecord);
    return failedRecord;
  }
  const targetCountry = rewritePayload.country_iso || countryIso || 'NG';

  if (rewritePayload.completeness === 'incomplete') {
    const incompleteRecord: PipelineArticleRecord = {
      id: `pipeline-inc-${Date.now()}`,
      slug: `incomplete-${Date.now()}`,
      source_url: normUrl,
      source_name: sourceName,
      source_published_at: scraped.source_published_at,
      content_type: rewritePayload.content_type,
      headline: rewritePayload.headline || rssHeadline,
      dek: rewritePayload.dek || '',
      body_markdown: rewritePayload.body_markdown || '',
      executive_summary: rewritePayload.executive_summary || '',
      fact_analysis: rewritePayload.fact_analysis || [],
      why_it_matters: rewritePayload.why_it_matters || '',
      legislative_scope: rewritePayload.legislative_scope || null,
      items: rewritePayload.items || [],
      actors: rewritePayload.actors || [],
      tags: rewritePayload.tags || [],
      country_code: targetCountry,
      language: 'en',
      category: 'politics',
      word_count: 0,
      read_minutes: 0,
      created_at: new Date().toISOString(),
      status: 'incomplete',
      incomplete_reason: rewritePayload.incomplete_reason || 'AI rewrite marked content as incomplete',
    };

    articlesBySourceUrl.set(normUrl, incompleteRecord);
    return incompleteRecord;
  }

  // 4. QUALITY GATES: Auto-validate rules
  const gateResult = validateQualityGates(rewritePayload, scraped);

  if (!gateResult.passed) {
    const rejectedRecord: PipelineArticleRecord = {
      id: `pipeline-rej-${Date.now()}`,
      slug: `rejected-${Date.now()}`,
      source_url: normUrl,
      source_name: sourceName,
      source_published_at: scraped.source_published_at,
      content_type: rewritePayload.content_type,
      headline: rewritePayload.headline,
      dek: rewritePayload.dek,
      body_markdown: rewritePayload.body_markdown,
      executive_summary: rewritePayload.executive_summary,
      fact_analysis: rewritePayload.fact_analysis,
      why_it_matters: rewritePayload.why_it_matters,
      legislative_scope: rewritePayload.legislative_scope,
      items: rewritePayload.items,
      actors: rewritePayload.actors,
      tags: rewritePayload.tags,
      country_code: targetCountry,
      language: 'en',
      category: 'politics',
      word_count: 0,
      read_minutes: 0,
      created_at: new Date().toISOString(),
      status: 'rejected',
      incomplete_reason: `Quality gates failed: ${gateResult.errors.join('; ')}`,
    };

    articlesBySourceUrl.set(normUrl, rejectedRecord);
    return rejectedRecord;
  }

  // 5. UNIQUE VOXPOLIS SLUG & STORE
  const slug = generateUniqueSlug(
    rewritePayload.suggested_slug_keywords || rewritePayload.headline,
    normUrl,
    scraped.source_published_at
  );

  const wordCount = rewritePayload.body_markdown.trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 220));

  // Featured Image: source og:image or first content image if valid, else site default breaking news asset
  const featuredImage = (scraped.image_url && scraped.image_url.startsWith('http'))
    ? scraped.image_url
    : '/breaking-news-banner.png';

  const publishedRecord: PipelineArticleRecord = {
    id: `vox-art-${slug}`,
    slug,
    source_url: normUrl,
    source_name: sourceName,
    source_published_at: scraped.source_published_at,
    content_type: rewritePayload.content_type,
    headline: rewritePayload.headline,
    dek: rewritePayload.dek,
    body_markdown: rewritePayload.body_markdown,
    executive_summary: rewritePayload.executive_summary,
    fact_analysis: rewritePayload.fact_analysis,
    why_it_matters: rewritePayload.why_it_matters,
    legislative_scope: rewritePayload.legislative_scope || null,
    items: rewritePayload.items,
    actors: rewritePayload.actors,
    tags: rewritePayload.tags,
    country_code: targetCountry,
    language: 'en',
    category: 'politics',
    original_image_url: featuredImage,
    image_credit: sourceName,
    image_source_url: normUrl,
    word_count: wordCount,
    read_minutes: readMinutes,
    created_at: scraped.source_published_at || new Date().toISOString(),
    status: 'published',
  };

  articlesBySourceUrl.set(normUrl, publishedRecord);
  articlesBySlug.set(slug, publishedRecord);

  // Persist to Supabase Postgres database for permanent multi-instance availability
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    await supabaseAdmin.from('articles').upsert(
      {
        slug,
        title: publishedRecord.headline,
        snippet: publishedRecord.dek || publishedRecord.executive_summary || publishedRecord.headline,
        content: publishedRecord.body_markdown,
        ai_analysis: publishedRecord.executive_summary
          ? `• Executive Summary: ${publishedRecord.executive_summary}\n• Why It Matters: ${publishedRecord.why_it_matters}`
          : `• News Recap: ${publishedRecord.dek}\n• Key Impact: Relevant policy updates documented by ${sourceName}.`,
        country_code: targetCountry,
        language: 'en',
        category: 'politics',
        original_image_url: featuredImage,
        source_name: sourceName,
        source_url: normUrl,
        tags: publishedRecord.tags,
        created_at: publishedRecord.created_at,
      },
      { onConflict: 'slug' }
    );
  } catch (err) {
    console.warn('Could not persist pipeline article to Supabase database:', err);
  }

  return publishedRecord;
}
