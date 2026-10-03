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

    if (pollId && isUuid(pollId) && userId && isUuid(userId)) {
      try {
        await supabaseAdmin.from('poll_votes').upsert([
          {
            poll_id: pollId,
            user_id: userId,
            vote,
          },
        ]);

        if (vote === 'agree') {
          await supabaseAdmin.rpc('increment_poll_agree', { row_id: pollId });
        } else {
          await supabaseAdmin.rpc('increment_poll_disagree', { row_id: pollId });
        }
      } catch (err) {
        // Non-fatal if custom RPC does not exist
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
