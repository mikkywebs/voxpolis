import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { userId, sentiment, feedbackText, storeRatingRedirected } = await req.json();

    if (userId) {
      // Mark user as having submitted feedback so they are never prompted again
      await supabaseAdmin
        .from('profiles')
        .update({ has_submitted_feedback: true })
        .eq('id', userId);

      await supabaseAdmin.from('feedback').insert([
        {
          user_id: userId,
          sentiment: sentiment, // 'positive' | 'negative'
          feedback_text: feedbackText || null,
          store_rating_redirected: storeRatingRedirected || false,
        },
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
