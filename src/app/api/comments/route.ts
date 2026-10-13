import { NextRequest, NextResponse } from 'next/server';
import { moderateComment } from '@/lib/moderation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const isUuid = (str?: string): boolean =>
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

export async function GET(req: NextRequest) {
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
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { articleId, articleSlug, userId, userName, userCountryFlag, userAvatar, content, parentId } = body || {};

    if (typeof content !== 'string' || !content.trim() || (!articleId && !articleSlug)) {
      return NextResponse.json({ error: 'Comment content and article reference are required.' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment exceeds maximum length of 2,000 characters.' }, { status: 400 });
    }

    // Run automated moderation pipeline
    const mod = moderateComment(content.trim());

    if (!mod.allowed) {
      return NextResponse.json({ error: mod.reason || 'Comment contains inappropriate content.' }, { status: 422 });
    }

    const verifiedUserId = await getVerifiedSessionUserId(req);
    const safeUserId =
      userId && isUuid(userId) && verifiedUserId === userId ? verifiedUserId : null;
    const safeUserName =
      typeof userName === 'string' && userName.trim()
        ? userName.trim().slice(0, 80)
        : 'Contributor';

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
              user_id: safeUserId,
              user_name: safeUserName,
              user_avatar: typeof userAvatar === 'string' ? userAvatar.slice(0, 500) : undefined,
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
      user_name: safeUserName,
      country_flag: typeof userCountryFlag === 'string' && userCountryFlag.trim() ? userCountryFlag.trim().slice(0, 16) : '🌐',
      content: mod.censoredText,
      created_at: 'Just now',
      reactions: { agree: 0, disagree: 0, angry: 0, insightful: 0 },
    };

    return NextResponse.json({ success: true, comment: resultComment });
  } catch {
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
