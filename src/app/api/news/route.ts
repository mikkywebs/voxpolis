import { NextRequest, NextResponse } from 'next/server';
import { getArticleBySlug, getLatestForCountry, getLatestWorld } from '@/lib/articles';
import { get301Redirect } from '@/lib/pipeline/redirects';

export const dynamic = 'force-dynamic';

/**
 * Client-side news API (used after a member signs in, by search and by archive pages).
 *   ?slug=<slug>       → one article
 *   ?country=NG        → latest for a country
 *   ?country=WORLD     → latest across all countries
 * Only real, published Voxpolis articles are returned. No placeholder content.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const slug = sp.get('slug');

  if (slug) {
    const target = get301Redirect(slug) || slug;
    const article = await getArticleBySlug(target);
    if (!article) return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    return NextResponse.json({ success: true, article, redirectedSlug: target !== slug ? target : undefined });
  }

  const country = (sp.get('country') || 'NG').toUpperCase();
  const limit = Math.min(Number(sp.get('limit')) || 40, 100);
  const articles = country === 'WORLD' ? await getLatestWorld(undefined, limit) : await getLatestForCountry(country, limit);

  return NextResponse.json(
    { success: true, country, articles },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
  );
}
