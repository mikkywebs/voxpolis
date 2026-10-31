import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCountryByCode, getCountryBySlug } from '@/config/countries';
import { articlePath } from '@/lib/paths';

export const dynamic = 'force-dynamic';

/**
 * The reader poll for a country: the question attached to the most recent PUBLISHED story
 * in that country (written for the story and approved by the editor), with its real vote counts.
 * No question → { poll: null } and the box is not shown. Nothing is generated or made up here.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const param = searchParams.get('country') || 'NG';
    const country = getCountryByCode(param) || getCountryBySlug(param);
    const since = new Date(Date.now() - 14 * 86400_000).toISOString();

    const { data: stories } = await supabaseAdmin
      .from('articles')
      .select('id, slug, title, country_code, reviewed_at')
      .eq('country_code', country.code)
      .eq('review_status', 'approved')
      .gte('reviewed_at', since)
      .order('reviewed_at', { ascending: false })
      .limit(30);
    const ids = (stories || []).map((s: any) => s.id);
    if (!ids.length) return NextResponse.json({ success: true, poll: null });

    const { data: polls } = await supabaseAdmin
      .from('polls')
      .select('id, article_id, question, agree_count, disagree_count')
      .in('article_id', ids);
    const withQuestion = (polls || []).filter((p: any) => (p.question || '').trim().endsWith('?'));
    // Newest published story that has a question.
    const story = (stories || []).find((s: any) => withQuestion.some((p: any) => p.article_id === s.id));
    if (!story) return NextResponse.json({ success: true, poll: null });
    const p: any = withQuestion.find((x: any) => x.article_id === story.id);

    return NextResponse.json(
      {
        success: true,
        poll: {
          id: p.id,
          question: p.question.trim(),
          agree_count: p.agree_count || 0,
          disagree_count: p.disagree_count || 0,
          article_title: story.title,
          article_path: articlePath(story),
          country_code: country.code,
          country_name: country.name,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ success: false, poll: null }, { status: 500 });
  }
}
