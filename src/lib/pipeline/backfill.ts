import { getAllPublishedPipelineArticles, processSourceUrlThroughPipeline } from './index';
import { register301Redirect } from './redirects';
import { ArticleData } from '../news';

export interface BackfillResult {
  total_checked: number;
  reprocessed_count: number;
  success_count: number;
  redirects_registered: number;
  failures: Array<{ slug: string; reason: string }>;
}

export function isLegacyRowIncomplete(article: Partial<ArticleData>): boolean {
  const body = (article.content || '').trim();
  const summary = (article.snippet || '').trim();
  const slug = (article.slug || '').trim();
  const wordCount = article.total_reading_time_seconds
    ? Math.floor((article.total_reading_time_seconds / 60) * 180)
    : body.split(/\s+/).filter(Boolean).length;

  // Criteria 1: Body contains [...] or …
  if (body.includes('[...]') || body.includes('…')) return true;

  // Criteria 2: Body equals executive_summary
  if (body.toLowerCase() === summary.toLowerCase()) return true;

  // Criteria 3: Word count < 150
  if (wordCount < 150 && !body.includes('\n\n')) return true;

  // Criteria 4: Slug ends in -2 or -3 cloned suffix
  if (slug.match(/-\d+$/) && (slug.endsWith('-2') || slug.endsWith('-3'))) return true;

  return false;
}

export async function runBackfillJob(
  legacyArticles: ArticleData[]
): Promise<BackfillResult> {
  const result: BackfillResult = {
    total_checked: legacyArticles.length,
    reprocessed_count: 0,
    success_count: 0,
    redirects_registered: 0,
    failures: [],
  };

  for (const art of legacyArticles) {
    if (!isLegacyRowIncomplete(art)) continue;

    result.reprocessed_count++;

    if (!art.source_url || !art.source_url.startsWith('http')) {
      result.failures.push({ slug: art.slug, reason: 'Missing source_url' });
      continue;
    }

    try {
      const updated = await processSourceUrlThroughPipeline(
        art.source_url,
        art.source_name,
        art.title,
        art.snippet,
        art.created_at,
        true // Force reprocess
      );

      if (updated.status === 'published') {
        result.success_count++;
        if (art.slug !== updated.slug) {
          register301Redirect(art.slug, updated.slug);
          result.redirects_registered++;
        }
      } else {
        result.failures.push({
          slug: art.slug,
          reason: updated.incomplete_reason || 'Failed quality gates during backfill',
        });
      }
    } catch (err: any) {
      result.failures.push({
        slug: art.slug,
        reason: err.message || 'Backfill pipeline exception',
      });
    }
  }

  return result;
}
