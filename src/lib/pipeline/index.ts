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

  // 3. ENFORCE REWRITING & QUALITY GATES VIA SHARED BOUNDARY
  // Enforces news-storage.ts boundaries: isAdminPublishedArticle, isTitleDuplicate, and isPoliticalNews
  const { validateAndPersistCandidateStory, isAdminPublishedArticle, isTitleDuplicate } = await import('@/lib/news-storage');
  const { isPoliticalNews } = await import('@/lib/news');

  const featuredImage = (scraped.image_url && scraped.image_url.startsWith('http'))
    ? scraped.image_url
    : undefined;

  const persistResult = await validateAndPersistCandidateStory({
    title: scraped.source_headline || rssHeadline,
    snippet: rssDescription || scraped.extracted_full_text.slice(0, 200),
    content: scraped.extracted_full_text,
    source_name: sourceName,
    source_url: normUrl,
    country_code: countryIso,
    created_at: scraped.source_published_at || rssDate,
    image_url: featuredImage,
    author: scraped.author,
  });

  if (!persistResult.success) {
    const rejectedRecord: PipelineArticleRecord = {
      id: `pipeline-rej-${Date.now()}`,
      slug: persistResult.slug || `rejected-${Date.now()}`,
      source_url: normUrl,
      source_name: sourceName,
      source_published_at: scraped.source_published_at,
      content_type: 'single_story',
      headline: rssHeadline || 'Rewrite Rejected',
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
      incomplete_reason: persistResult.reason || 'Failed quality gates during rewrite',
    };
    articlesBySourceUrl.set(normUrl, rejectedRecord);
    return rejectedRecord;
  }

  // Persisted or already_exists:
  const art = persistResult.article;
  const slug = persistResult.slug || art?.slug || `vox-${Date.now()}`;
  const headline = art?.title || rssHeadline;
  const body = art?.content || '';
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 220));

  const publishedRecord: PipelineArticleRecord = {
    id: art?.id || `vox-art-${slug}`,
    slug,
    source_url: normUrl,
    source_name: sourceName,
    source_published_at: scraped.source_published_at,
    content_type: 'single_story',
    headline,
    dek: art?.snippet || '',
    body_markdown: body,
    executive_summary: art?.snippet || '',
    fact_analysis: [],
    why_it_matters: '',
    legislative_scope: null,
    items: [],
    actors: [],
    tags: art?.tags || [countryIso, 'Politics'],
    country_code: countryIso,
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

  return publishedRecord;
}
