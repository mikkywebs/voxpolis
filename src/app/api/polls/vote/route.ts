import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const isUuid = (s?: unknown) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

async function signedInUser(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    const { data } = await supabaseAdmin.auth.getUser(auth.slice(7).trim());
    if (data?.user?.id) return data.user.id;
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
  } catch {}
  return null;
}

/**
 * Reader polls: members only, one vote per member per poll (changing your vote replaces it).
 * Counts are recomputed from the stored votes every time, so they are always real.
 *   GET  /api/polls/vote?pollId=…   → counts + your vote (if signed in)
 *   POST /api/polls/vote { pollId, vote: 'agree' | 'disagree' }
 */
export async function GET(req: NextRequest) {
  const pollId = req.nextUrl.searchParams.get('pollId');
  if (!isUuid(pollId)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const { data: poll } = await supabaseAdmin.from('polls').select('agree_count, disagree_count').eq('id', pollId).maybeSingle();
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  const user = await signedInUser(req);
  let mine: string | null = null;
  if (user) {
    const { data } = await supabaseAdmin.from('poll_votes').select('vote').eq('poll_id', pollId).eq('user_id', user).maybeSingle();
    mine = data?.vote || null;
  }
  return NextResponse.json({ agree: poll.agree_count || 0, disagree: poll.disagree_count || 0, myVote: mine, signedIn: !!user }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { pollId, vote } = body || {};
  if (!isUuid(pollId) || !['agree', 'disagree'].includes(vote)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in to vote', needsSignIn: true }, { status: 401 });

  // Only polls on published stories can be voted on.
  const { data: poll } = await supabaseAdmin.from('polls').select('id, articles!inner(review_status)').eq('id', pollId).maybeSingle();
  if (!poll || (poll as any).articles?.review_status !== 'approved') return NextResponse.json({ error: 'This poll is closed' }, { status: 404 });

  const { data, error } = await supabaseAdmin.rpc('cast_poll_vote', { p_poll: pollId, p_user: user, p_vote: vote });
  if (error) return NextResponse.json({ error: 'Could not save your vote' }, { status: 500 });
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ success: true, agree: row?.agree ?? 0, disagree: row?.disagree ?? 0, myVote: vote });
}
