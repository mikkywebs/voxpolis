import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { analyticsStore } from '@/lib/analytics-tracker';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId') || searchParams.get('slug');
    if (!articleId) {
      return NextResponse.json({ views: 0 });
    }

    let views = analyticsStore.getViewsForArticle(articleId);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId);
      const query = supabaseAdmin.from('articles').select('views_count');
      const { data } = isUuid
        ? await query.eq('id', articleId).maybeSingle()
        : await query.eq('slug', articleId).maybeSingle();

      if (data?.views_count) {
        views = Math.max(views, data.views_count);
      }
    } catch {}

    return NextResponse.json({ views });
  } catch {
    return NextResponse.json({ views: 0 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { articleId, slug, title, countryCode, isMember } = body;
    const key = articleId || slug;

    if (!key) {
      return NextResponse.json({ success: false, error: 'articleId or slug required' }, { status: 400 });
    }

    const nextCount = analyticsStore.recordView({
      articleId: key,
      slug: slug || key,
      title: title || 'Political Brief',
      countryCode: countryCode || 'NG',
      isMember: !!isMember,
    });

    return NextResponse.json({ success: true, views: nextCount });
  } catch {
    return NextResponse.json({ success: true, views: 1 });
  }
}
