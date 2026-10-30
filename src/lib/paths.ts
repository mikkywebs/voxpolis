import { getCountryByCode, getCountrySlug } from '@/config/countries';

/** Public address of a story: /<country>/<short-title>, e.g. /nigeria/peter-obi-tinubu-campaign-2027 */
export function articlePath(a: { slug: string; country_code?: string | null }): string {
  if (!a.country_code) return `/news/${a.slug}`; // old route; redirects to the canonical address
  return `/${getCountrySlug(getCountryByCode(a.country_code))}/${a.slug}`;
}

/** Slugs that would clash with fixed pages under /<country>/ */
export const RESERVED_SLUGS = new Set(['archive', 'page', 'feed', 'rss', 'amp', 'news', 'latest']);

/** Turn words into a clean web address part: lowercase, hyphens, max ~70 characters, no trailing hyphen. */
export function toSlug(text: string, maxLen = 70): string {
  const s = (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  if (s.length <= maxLen) return s.replace(/^-|-$/g, '');
  const cut = s.slice(0, maxLen);
  return cut.slice(0, cut.lastIndexOf('-') > 20 ? cut.lastIndexOf('-') : maxLen).replace(/^-|-$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 8 && slug.length <= 80 && !RESERVED_SLUGS.has(slug);
}
