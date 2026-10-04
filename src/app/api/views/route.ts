import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const inMemoryViews: Record<string, number> = {};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId');
    if (!articleId) {
      return NextResponse.json({ views: 0 });
    }

    let views = inMemoryViews[articleId] || 0;

    try {
      const { data } = await supabaseAdmin
        .from('article_views')
        .select('views_count')
        .eq('article_id', articleId)
        .maybeSingle();

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
    const { articleId } = body;
    if (!articleId) {
      return NextResponse.json({ success: false, error: 'articleId required' }, { status: 400 });
    }

    inMemoryViews[articleId] = (inMemoryViews[articleId] || 0) + 1;
    let nextCount = inMemoryViews[articleId];

    try {
      const { data } = await supabaseAdmin
        .from('article_views')
        .select('views_count')
        .eq('article_id', articleId)
        .maybeSingle();

      const updatedCount = (data?.views_count || 0) + 1;
      await supabaseAdmin.from('article_views').upsert([
        {
          article_id: articleId,
          views_count: updatedCount,
          updated_at: new Date().toISOString(),
        },
      ]);
      nextCount = updatedCount;
      inMemoryViews[articleId] = nextCount;
    } catch {}

    return NextResponse.json({ success: true, views: nextCount });
  } catch {
    return NextResponse.json({ success: true, views: 1 });
  }
}
