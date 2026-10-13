import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const isUuid = (str?: string) =>
  typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

async function getVerifiedSessionUserId(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers?.get?.('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && data?.user?.id) return data.user.id;
    }

    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user?.id) return data.user.id;
    } catch {}
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pollId, articleSlug, vote, userId } = body || {};

    if (!vote || !['agree', 'disagree'].includes(vote)) {
      return NextResponse.json({ error: 'Valid vote option required' }, { status: 400 });
    }

    if (pollId && isUuid(pollId)) {
      try {
        const verifiedUserId = await getVerifiedSessionUserId(req);
        if (userId && isUuid(userId) && verifiedUserId === userId) {
          await supabaseAdmin.from('poll_votes').upsert([
            {
              poll_id: pollId,
              user_id: verifiedUserId,
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
      } catch {
        // Fallback gracefully
      }
    }

    return NextResponse.json({
      success: true,
      pollId: pollId || articleSlug,
      vote,
      savedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to process poll vote' }, { status: 500 });
  }
}
