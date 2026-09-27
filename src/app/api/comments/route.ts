import { NextResponse } from 'next/server';
import { moderateComment } from '@/lib/moderation';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { articleId, userId, userName, userAvatar, content } = body;

    if (!content || !articleId) {
      return NextResponse.json({ error: 'Comment content and article ID are required.' }, { status: 400 });
    }

    // Run automated moderation pipeline
    const mod = moderateComment(content);

    if (!mod.allowed) {
      return NextResponse.json({ error: mod.reason || 'Comment contains inappropriate content.' }, { status: 422 });
    }

    // Save comment to database
    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert([
        {
          article_id: articleId,
          user_id: userId || null,
          user_name: userName || 'Guest Analyst',
          user_avatar: userAvatar || undefined,
          content: mod.censoredText,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn('Supabase comment insert failed, returning moderated comment object.', error);
      return NextResponse.json({
        id: `local-${Date.now()}`,
        article_id: articleId,
        user_name: userName || 'Guest Analyst',
        content: mod.censoredText,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
