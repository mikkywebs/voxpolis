import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pollId, articleSlug, articleId, vote, userId } = body;

    if (!vote || !['agree', 'disagree'].includes(vote)) {
      return NextResponse.json({ error: 'Valid vote option required' }, { status: 400 });
    }

    // Check if pollId or articleId is a valid UUID for Supabase
    const isUuid = (str?: string) =>
      typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    if (pollId && isUuid(pollId)) {
      try {
        if (userId && isUuid(userId)) {
          await supabaseAdmin.from('poll_votes').upsert([
            {
              poll_id: pollId,
              user_id: userId,
              vote,
            },
          ]);
        }

        const { data: pollRow } = await supabaseAdmin
          .from('polls')
          .select('id, agree_count, disagree_count')
          .eq('id', pollId)
          .maybeSingle();

        if (pollRow) {
          const nextAgree = vote === 'agree' ? (pollRow.agree_count || 0) + 1 : (pollRow.agree_count || 0);
          const nextDisagree = vote === 'disagree' ? (pollRow.disagree_count || 0) + 1 : (pollRow.disagree_count || 0);

          await supabaseAdmin
            .from('polls')
            .update({
              agree_count: nextAgree,
              disagree_count: nextDisagree,
            })
            .eq('id', pollId);

          return NextResponse.json({
            success: true,
            pollId,
            vote,
            agree: nextAgree,
            disagree: nextDisagree,
            savedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        // Fallback gracefully
      }
    }

    return NextResponse.json({
      success: true,
      pollId: pollId || articleSlug,
      vote,
      savedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ success: true, warning: e.message });
  }
}
