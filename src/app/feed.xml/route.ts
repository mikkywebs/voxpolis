import { getLatestApproved } from '@/lib/articles';
import { getCountryByCode } from '@/config/countries';
import { articlePath } from '@/lib/paths';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

// RSS feed of the latest Voxpolis stories (for readers, aggregators and social tools).
export const revalidate = 600;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET() {
  const items = (await getLatestApproved(50))
    .map((a) => {
      const link = `${SITE_URL}${articlePath(a)}`;
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(a.created_at).toUTCString()}</pubDate>
      <category>${esc(getCountryByCode(a.country_code).name)}</category>
      <description>${esc(a.dek || a.snippet || '')}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${SITE_NAME}</title>
    <link>${SITE_URL}</link>
    <description>${esc(SITE_DESCRIPTION)}</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
