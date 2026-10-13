import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

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
    } catch {
      // Outside Next.js cookie context
    }
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sentiment, feedbackText, storeRatingRedirected } = body || {};

    if (!sentiment || !['positive', 'negative'].includes(sentiment)) {
      return NextResponse.json({ error: 'Valid sentiment is required' }, { status: 400 });
    }

    const verifiedUserId = await getVerifiedSessionUserId(req);

    // If caller claims a userId, require it to match the authenticated session user
    if (userId && (!verifiedUserId || verifiedUserId !== userId)) {
      return NextResponse.json({ error: 'Unauthorized user identity' }, { status: 401 });
    }

    const effectiveUserId = verifiedUserId;
    const cleanFeedbackText =
      typeof feedbackText === 'string' && feedbackText.trim()
        ? feedbackText.trim().slice(0, 2000)
        : null;

    if (effectiveUserId) {
      // Mark authenticated user as having submitted feedback so they are never prompted again
      await supabaseAdmin
        .from('profiles')
        .update({ has_submitted_feedback: true })
        .eq('id', effectiveUserId);

      await supabaseAdmin.from('feedback').insert([
        {
          user_id: effectiveUserId,
          sentiment,
          feedback_text: cleanFeedbackText,
          store_rating_redirected: Boolean(storeRatingRedirected),
        },
      ]);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
