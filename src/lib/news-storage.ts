import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  isPoliticalNews,
  isRelevantToCountry,
  generateAiAnalysisSummary,
  ArticleData,
} from '@/lib/news';
import { isCurrentMonthArticle } from '@/lib/rss';
import {
  rewriteStoryForVoxpolis,
  decodeAllHtmlEntities,
  RewrittenStory,
} from '@/lib/news-rewriter';
import { findConsecutiveWordOverlaps } from '@/lib/pipeline/overlap';
import { getCountryByCode } from '@/config/countries';

export interface CandidateStoryInput {
  title: string;
  snippet?: string;
  content?: string;
  source_name: string;
  source_url: string;
  country_code: string;
  created_at?: string;
  image_url?: string;
  tags?: string[];
  language?: string;
}

export type StorageGateFailure =
  | 'political_filter'
  | 'country_relevance'
  | 'current_month'
  | 'ai_rewrite'
  | 'plagiarism_overlap';

export interface PersistResult {
  success: boolean;
  status: 'persisted' | 'already_exists' | 'rejected' | 'admin_protected' | 'db_error';
  articleId?: string;
  slug?: string;
  gateFailed?: StorageGateFailure;
  reason?: string;
}

export const ENGLISH_STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
  'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Normalizes full title for exact comparison:
 * - strips trailing outlet watermarks (e.g. " - Voxpolis", " - RNZ", " | BBC News")
 * - converts to lowercase
 * - replaces non-alphanumeric chars with spaces
 * - collapses whitespace
 */
export function normalizeFullTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/\s*[-–—|]\s*(voxpolis|[a-z0-9\s]{2,25})$/i, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts significant content tokens (stop words removed, token length >= 2).
 */
export function extractContentTokens(title: string): string[] {
  const norm = normalizeFullTitle(title);
  if (!norm) return [];
  return norm
    .split(' ')
    .filter((token) => token.length >= 2 && !ENGLISH_STOP_WORDS.has(token));
}

/**
 * Computes Dice token similarity coefficient between two headlines:
 * 2 * |A ∩ B| / (|A| + |B|)
 */
export function calculateTitleDiceSimilarity(titleA: string, titleB: string): number {
  const tokensA = extractContentTokens(titleA);
  const tokensB = extractContentTokens(titleB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setB = new Set(tokensB);
  const uniqueA = Array.from(new Set(tokensA));
  let intersectionCount = 0;
  for (let i = 0; i < uniqueA.length; i++) {
    const t = uniqueA[i];
    if (setB.has(t)) {
      intersectionCount++;
    }
  }

  return (2 * intersectionCount) / (tokensA.length + tokensB.length);
}

/**
 * Checks whether candidate headline is a duplicate of an existing headline:
 * 1. Exact normalized title match (100% duplicate).
 * 2. High token similarity (Dice >= 0.85) when both titles have sufficient content tokens (>= 4).
 * If content tokens < 4, Dice alone is considered ambiguous and will not reject.
 */
export function isTitleDuplicate(
  candidateTitle: string,
  existingTitle: string,
  threshold: number = 0.85
): { isDuplicate: boolean; matchType: 'exact' | 'similarity' | 'none'; score: number } {
  const normCand = normalizeFullTitle(candidateTitle);
  const normExist = normalizeFullTitle(existingTitle);

  if (normCand && normCand === normExist) {
    return { isDuplicate: true, matchType: 'exact', score: 1.0 };
  }

  const tokensCand = extractContentTokens(candidateTitle);
  const tokensExist = extractContentTokens(existingTitle);

  // If either title has fewer than 4 significant content tokens, similarity match is ambiguous
  if (tokensCand.length < 4 || tokensExist.length < 4) {
    return { isDuplicate: false, matchType: 'none', score: 0 };
  }

  const score = calculateTitleDiceSimilarity(candidateTitle, existingTitle);
  if (score >= threshold) {
    return { isDuplicate: true, matchType: 'similarity', score };
  }

  return { isDuplicate: false, matchType: 'none', score };
}

/**
 * Alias for normalizeFullTitle for backwards compatibility with earlier callers.
 */
export function extractStoryNormKey(title: string): string {
  return normalizeFullTitle(title);
}

/**
 * Checks whether an existing database article is an admin-published/curated Voxpolis article.
 * Admin articles must NEVER be overwritten, modified, or deleted by automated ingestion.
 *
 * Checks exact editorial markers:
 * 1. Explicit Voxpolis attribution (source_name === 'Voxpolis')
 * 2. Exact 'Featured News' editorial tag (case-insensitive exact match; ignores loose 'featured' wire tags)
 * 3. Editorial headline watermark (ends with " - Voxpolis", "— Voxpolis", or "| Voxpolis")
 * 4. Voxpolis internal canonical URL (starts with https://voxpolis.app/news/)
 */
export function isAdminPublishedArticle(article: {
  source_name?: string | null;
  tags?: string[] | null;
  title?: string | null;
  source_url?: string | null;
  is_featured?: boolean | null;
}): boolean {
  if (!article) return false;
  if (article.source_name === 'Voxpolis') return true;
  if (article.is_featured === true) return true;
  if (
    Array.isArray(article.tags) &&
    article.tags.some((t) => typeof t === 'string' && t.trim().toLowerCase() === 'featured news')
  ) {
    return true;
  }
  if (
    article.title &&
    typeof article.title === 'string' &&
    /\s*[-–—|]\s*Voxpolis\s*$/i.test(article.title)
  ) {
    return true;
  }
  if (
    article.source_url &&
    typeof article.source_url === 'string' &&
    /^https:\/\/voxpolis\.app\/news\//i.test(article.source_url)
  ) {
    return true;
  }
  return false;
}

/**
 * Validates an incoming wire story against all 5 quality gates and safely persists it to Supabase.
 *
 * GATE 1: Political Governance Filter (isPoliticalNews + Governance Shield)
 * GATE 2: Country Relevance Filter (isRelevantToCountry)
 * GATE 3: Current Month Recency (isCurrentMonthArticle)
 * GATE 4: AI Rewrite Completeness (rewriteStoryForVoxpolis)
 * GATE 5: Zero Verbatim Overlap (findConsecutiveWordOverlaps <= 7 words)
 *
 * DEDUPLICATION:
 * - Checks exact source_url
 * - Checks 6-word title normKey against recent country articles
 * - Checks slug collision against existing articles (strictly protecting admin stories)
 *
 * POLLS: Does NOT create or modify polls (deferred until explicit authorization).
 */
export async function validateAndPersistCandidateStory(
  input: CandidateStoryInput
): Promise<PersistResult> {
  const countryCode = (input.country_code || 'NG').toUpperCase();
  const country = getCountryByCode(countryCode);
  const countryName = country?.name || countryCode;
  const language = (input.language || country?.languages[0]?.code || 'en').toLowerCase();

  const cleanTitle = decodeAllHtmlEntities(input.title || '').trim();
  const cleanSnippet = decodeAllHtmlEntities(input.snippet || '').trim();
  const cleanContent = decodeAllHtmlEntities(input.content || cleanSnippet).trim();
  const rawSourceUrl = (input.source_url || '').trim();
  const sourceName = decodeAllHtmlEntities(input.source_name || 'Press Outlet').trim();
  const createdAt = input.created_at || new Date().toISOString();
  const tags = Array.isArray(input.tags) ? input.tags : [];

  if (!cleanTitle) {
    return {
      success: false,
      status: 'rejected',
      gateFailed: 'political_filter',
      reason: 'Missing headline',
    };
  }

  // 1. GATE 1: Political Governance Filter
  const passesPoliticalFilter = isPoliticalNews(cleanTitle, cleanSnippet, tags, rawSourceUrl);
  if (!passesPoliticalFilter) {
    return {
      success: false,
      status: 'rejected',
      gateFailed: 'political_filter',
      reason: 'Rejected by global political-filtering rules and Governance Shield',
    };
  }

  // 2. GATE 2: Country Relevance Filter
  const passesCountryRelevance = isRelevantToCountry(cleanTitle, cleanSnippet, countryCode);
  if (!passesCountryRelevance) {
    return {
      success: false,
      status: 'rejected',
      gateFailed: 'country_relevance',
      reason: `Story headline/snippet not relevant to country ${countryCode}`,
    };
  }

  // 3. GATE 3: Current Month Recency Filter
  const isCurrentMonth = isCurrentMonthArticle(createdAt);
  if (!isCurrentMonth) {
    return {
      success: false,
      status: 'rejected',
      gateFailed: 'current_month',
      reason: `Story publication date (${createdAt}) is outside the current calendar month`,
    };
  }

  // 4. DEDUPLICATION LAYER 1: Exact source_url in database
  if (rawSourceUrl && rawSourceUrl.startsWith('http')) {
    try {
      const { data: existingUrlArticle, error: urlErr } = await supabaseAdmin
        .from('articles')
        .select('id, slug, source_name, tags')
        .eq('source_url', rawSourceUrl)
        .maybeSingle();

      if (!urlErr && existingUrlArticle) {
        return {
          success: true,
          status: 'already_exists',
          articleId: existingUrlArticle.id,
          slug: existingUrlArticle.slug,
          reason: 'Story with identical source URL already persisted in database',
        };
      }
    } catch (err: any) {
      console.warn('[NewsStorage] Deduplication check by source_url error:', err?.message || err);
    }
  }

  // 5. DEDUPLICATION LAYER 2: Title duplication check (exact match & Dice similarity >= 0.85)
  const normTitle = normalizeFullTitle(cleanTitle);
  if (normTitle) {
    try {
      const { data: recentArticles, error: recentErr } = await supabaseAdmin
        .from('articles')
        .select('id, slug, title, source_name, tags')
        .eq('country_code', countryCode)
        .order('created_at', { ascending: false })
        .limit(40);

      if (!recentErr && recentArticles && recentArticles.length > 0) {
        let duplicateMatch: { article: (typeof recentArticles)[0]; matchType: 'exact' | 'similarity'; score: number } | null = null;

        for (const art of recentArticles) {
          const matchResult = isTitleDuplicate(cleanTitle, art.title, 0.85);
          if (matchResult.isDuplicate && (matchResult.matchType === 'exact' || matchResult.matchType === 'similarity')) {
            duplicateMatch = { article: art, matchType: matchResult.matchType, score: matchResult.score };
            break;
          }
        }

        if (duplicateMatch) {
          const dupArt = duplicateMatch.article;
          const scorePercent = Math.round(duplicateMatch.score * 100);
          return {
            success: true,
            status: 'already_exists',
            articleId: dupArt.id,
            slug: dupArt.slug,
            reason: `Near-identical story already persisted for ${countryCode} (matched "${dupArt.title}" via ${duplicateMatch.matchType} [${scorePercent}%])`,
          };
        }
      }
    } catch (err: any) {
      console.warn('[NewsStorage] Deduplication check by title error:', err?.message || err);
    }
  }

  // 6. GATE 4: AI Rewriting & Synthesis
  let rewritten: RewrittenStory;
  try {
    rewritten = await rewriteStoryForVoxpolis({
      title: cleanTitle,
      content: cleanContent || cleanSnippet,
      sourceName,
      countryName,
      sourceUrl: rawSourceUrl,
    });
  } catch (err: any) {
    return {
      success: false,
      status: 'rejected',
      gateFailed: 'ai_rewrite',
      reason: `AI rewrite execution failed: ${err?.message || err}`,
    };
  }

  if (
    !rewritten.isAiRewritten ||
    !rewritten.slug ||
    !rewritten.content ||
    rewritten.content.trim().length < 80 ||
    rewritten.paragraphs.length < 2
  ) {
    return {
      success: false,
      status: 'rejected',
      gateFailed: 'ai_rewrite',
      reason: 'AI rewrite returned incomplete, missing, or unrewritten content',
    };
  }

  // 7. GATE 5: Zero Verbatim Plagiarism Overlap Gate (max 7 consecutive words)
  const rawSourceText = `${cleanTitle}\n${cleanContent}\n${cleanSnippet}`;
  const overlaps = findConsecutiveWordOverlaps(rawSourceText, rewritten.content, 8);
  if (overlaps.length > 0) {
    return {
      success: false,
      status: 'rejected',
      gateFailed: 'plagiarism_overlap',
      reason: `Quality gate failed: 8+ word consecutive verbatim overlap detected ("${overlaps[0]}")`,
    };
  }

  // 8. DEDUPLICATION LAYER 3: Slug collision check with strict admin protection
  try {
    const { data: existingSlugArticle, error: slugErr } = await supabaseAdmin
      .from('articles')
      .select('id, slug, source_name, tags')
      .eq('slug', rewritten.slug)
      .maybeSingle();

    if (!slugErr && existingSlugArticle) {
      // Check admin protection
      if (isAdminPublishedArticle(existingSlugArticle)) {
        return {
          success: false,
          status: 'admin_protected',
          articleId: existingSlugArticle.id,
          slug: existingSlugArticle.slug,
          reason: 'Slug collides with an admin-published Voxpolis article. Overwrite prevented.',
        };
      }

      // If existing non-admin article has identical slug, it is already persisted
      return {
        success: true,
        status: 'already_exists',
        articleId: existingSlugArticle.id,
        slug: existingSlugArticle.slug,
        reason: 'Article with identical slug already persisted in database',
      };
    }
  } catch (err: any) {
    console.warn('[NewsStorage] Slug collision check error:', err?.message || err);
  }

  // 9. PERSISTENCE: Insert validated article into public.articles
  const wordCount = rewritten.content.trim().split(/\s+/).filter(Boolean).length;
  const readingTimeSeconds = Math.max(120, Math.round((wordCount / 220) * 60));
  const aiAnalysis = generateAiAnalysisSummary(
    rewritten.title,
    rewritten.snippet,
    sourceName,
    countryName
  );

  // Strip exact 'Featured News' editorial marker from incoming wire tags
  const sanitizedWireTags = tags.filter(
    (t) => typeof t === 'string' && t.trim().toLowerCase() !== 'featured news'
  );

  const cleanTags = Array.from(
    new Set([...sanitizedWireTags, countryName, 'Politics'].filter(Boolean))
  );

  const newArticleRow = {
    slug: rewritten.slug,
    title: rewritten.title,
    snippet: rewritten.snippet,
    content: rewritten.content,
    ai_analysis: aiAnalysis || `• Verified Governance Report: Sourced from ${sourceName} for ${countryName}.\n• Civic Overview: Public affairs coverage documented by Voxpolis Editorial Desk.`,
    country_code: countryCode,
    language,
    category: 'politics',
    image_mode: input.image_url ? ('original' as const) : ('breaking_logo' as const),
    original_image_url: input.image_url && input.image_url.startsWith('http') ? input.image_url : undefined,
    source_name: sourceName,
    source_url: rawSourceUrl || `https://voxpolis.app/news/${rewritten.slug}`,
    is_breaking: false,
    tags: cleanTags,
    views_count: 0,
    total_reading_time_seconds: readingTimeSeconds,
    created_at: createdAt,
  };

  try {
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('articles')
      .insert(newArticleRow)
      .select('id, slug')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        // Unique constraint violation occurred (e.g. concurrent insert on slug).
        // Safely identify the conflicting article without updating or deleting anything.
        try {
          let conflictingArticle: { id: string; slug: string } | null = null;

          // Attempt 1: Query by slug
          const { data: bySlug, error: slugLookupErr } = await supabaseAdmin
            .from('articles')
            .select('id, slug')
            .eq('slug', rewritten.slug)
            .maybeSingle();

          if (!slugLookupErr && bySlug) {
            conflictingArticle = bySlug;
          } else if (rawSourceUrl && rawSourceUrl.startsWith('http')) {
            // Attempt 2: Query by source_url and country_code if slug did not match
            const { data: byUrl, error: urlLookupErr } = await supabaseAdmin
              .from('articles')
              .select('id, slug')
              .eq('source_url', rawSourceUrl)
              .eq('country_code', countryCode)
              .maybeSingle();

            if (!urlLookupErr && byUrl) {
              conflictingArticle = byUrl;
            }
          }

          if (conflictingArticle) {
            return {
              success: true,
              status: 'already_exists',
              articleId: conflictingArticle.id,
              slug: conflictingArticle.slug,
              reason: `Article already persisted in database (ID: ${conflictingArticle.id})`,
            };
          }
        } catch (lookupErr: any) {
          console.warn('[NewsStorage] Error resolving conflicting article for 23505:', lookupErr);
        }

        // If the conflicting record cannot be safely identified, return a safe failure result rather than claiming a match
        return {
          success: false,
          status: 'db_error',
          slug: rewritten.slug,
          reason: `Unique constraint conflict (23505) occurred, but existing conflicting record could not be confirmed: ${insertErr.message}`,
        };
      }

      console.error('[NewsStorage] Database insert error:', insertErr);
      return {
        success: false,
        status: 'db_error',
        slug: rewritten.slug,
        reason: `Failed to persist article to Supabase: ${insertErr.message}`,
      };
    }

    return {
      success: true,
      status: 'persisted',
      articleId: inserted.id,
      slug: inserted.slug,
    };
  } catch (err: any) {
    console.error('[NewsStorage] Database unexpected exception:', err);
    return {
      success: false,
      status: 'db_error',
      slug: rewritten.slug,
      reason: `Database exception during insert: ${err?.message || err}`,
    };
  }
}
