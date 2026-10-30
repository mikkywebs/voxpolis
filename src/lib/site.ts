/** Site-wide constants. Set NEXT_PUBLIC_SITE_URL in Vercel to your primary domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.voxpolis.app').replace(/\/$/, '');
export const SITE_NAME = 'Voxpolis';
export const SITE_TAGLINE = 'Political news, explained';
export const SITE_DESCRIPTION =
  'Voxpolis explains the day’s political news from Nigeria, Africa and the world in clear, original reporting: what happened, why it matters, and what comes next.';
export const DEFAULT_OG_IMAGE = '/breaking-news-banner.png';

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Strip the legacy " - Voxpolis" suffix older rows carry in their title. */
export function cleanTitle(title: string): string {
  return (title || '').replace(/\s*[-–—|]\s*Voxpolis\s*$/i, '').trim();
}

export function truncate(text: string, max: number): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : cut.length)}…`;
}

/**
 * A photo may be shown only if we have the right to use it:
 * - a licensed photo with its credit stored (Wikimedia Commons), or
 * - an image Voxpolis owns: uploaded by you through the admin page (Supabase storage / inline) or a site asset.
 * Publisher photos fail this test and are never shown.
 */
export function isUsablePhoto(url?: string | null, credit?: string | null): boolean {
  if (!url) return false;
  if (credit) return true;
  return url.startsWith('/') || url.startsWith('data:image/') || /\.supabase\.co\/storage\//.test(url);
}
