import { getSitemapEntries } from '@/lib/articles';
import { articlePath } from '@/lib/paths';
import { SITE_NAME, SITE_URL } from '@/lib/site';

// Google News sitemap: stories from the last 48 hours only.
export const revalidate = 600;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET() {
  const cutoff = Date.now() - 48 * 3600_000;
  const recent = (await getSitemapEntries(1000)).filter((a) => new Date(a.created_at).getTime() >= cutoff);

  const items = recent
    .map(
      (a) => `  <url>
    <loc>${SITE_URL}${esc(articlePath(a))}</loc>
    <news:news>
      <news:publication><news:name>${SITE_NAME}</news:name><news:language>en</news:language></news:publication>
      <news:publication_date>${new Date(a.created_at).toISOString()}</news:publication_date>
      <news:title>${esc(a.title)}</news:title>
    </news:news>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
