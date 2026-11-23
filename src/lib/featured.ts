import type { ArticleData } from '@/lib/news';

const DAY = 24 * 3600_000;
const hasPhoto = (a: ArticleData) => !!a.original_image_url && !a.original_image_url.startsWith('data:');

/**
 * Stories for the featured slider (max 5):
 *   1. stories the editor ticked "Feature on homepage" (last 7 days, with a photo), newest pick first
 *   2. then Nigeria stories with a photo from the last 48 hours
 *   3. then any story with a photo, newest first
 * Opinion pieces are never auto-picked.
 */
export function pickFeatured(featured: ArticleData[], articles: ArticleData[], max = 5): ArticleData[] {
  const now = Date.now();
  const out: ArticleData[] = [];
  const add = (a: ArticleData) => {
    if (out.length < max && !out.some((x) => x.id === a.id)) out.push(a);
  };
  const ticked = [...featured, ...articles.filter((a) => a.is_featured)]
    .filter((a) => hasPhoto(a) && now - new Date(a.featured_at || a.created_at).getTime() < 7 * DAY)
    .sort((x, y) => new Date(y.featured_at || y.created_at).getTime() - new Date(x.featured_at || x.created_at).getTime());
  ticked.forEach(add);
  const auto = articles.filter((a) => hasPhoto(a) && a.category !== 'opinion');
  auto.filter((a) => a.country_code === 'NG' && now - new Date(a.created_at).getTime() < 2 * DAY).forEach(add);
  [...auto].sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()).forEach(add);
  return out;
}
