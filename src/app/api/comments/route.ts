import { NextResponse } from 'next/server';
import { moderateComment } from '@/lib/moderation';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const isUuid = (str?: string): boolean =>
  typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId');
    const slug = searchParams.get('slug');

    if (!articleId && !slug) {
      return NextResponse.json({ comments: [] });
    }

    if (articleId && isUuid(articleId)) {
      const { data, error } = await supabaseAdmin
        .from('comments')
        .select('*')
        .eq('article_id', articleId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const formatted = data.map((row: any) => ({
          id: row.id,
          parentId: null,
          user_name: row.user_name || 'Contributor',
          country_flag: '🌐',
          content: row.content,
          created_at: new Date(row.created_at).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          reactions: { agree: 0, disagree: 0, angry: 0, insightful: 0 },
        }));
        return NextResponse.json({ comments: formatted });
      }
    }

    return NextResponse.json({ comments: [] });
  } catch (e: any) {
    return NextResponse.json({ comments: [], warning: e.message });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { articleId, articleSlug, userId, userName, userCountryFlag, userAvatar, content, parentId } = body;

    if (!content || (!articleId && !articleSlug)) {
      return NextResponse.json({ error: 'Comment content and article reference are required.' }, { status: 400 });
    }

    // Run automated moderation pipeline
    const mod = moderateComment(content);

    if (!mod.allowed) {
      return NextResponse.json({ error: mod.reason || 'Comment contains inappropriate content.' }, { status: 422 });
    }

    const commentId = `c-${Date.now()}`;
    let dbRow: any = null;

    // Save comment to database if articleId is a valid UUID
    if (articleId && isUuid(articleId)) {
      try {
        const { data, error } = await supabaseAdmin
          .from('comments')
          .insert([
            {
              article_id: articleId,
              user_id: (userId && isUuid(userId)) ? userId : null,
              user_name: userName || 'Contributor',
              user_avatar: userAvatar || undefined,
              content: mod.censoredText,
            },
          ])
          .select()
          .single();

        if (!error && data) {
          dbRow = data;
        }
      } catch (err) {
        console.warn('Supabase comment insert failed, using fallback return.', err);
      }
    }

    const resultComment = {
      id: dbRow?.id || commentId,
      parentId: parentId || null,
      user_name: userName || 'Contributor',
      country_flag: userCountryFlag || '🌐',
      content: mod.censoredText,
      created_at: 'Just now',
      reactions: { agree: 0, disagree: 0, angry: 0, insightful: 0 },
    };

    return NextResponse.json({ success: true, comment: resultComment });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
