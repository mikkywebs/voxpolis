import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export type ReactionType = 'upvote' | 'downvote' | 'funny' | 'love' | 'surprised' | 'angry' | 'sad';

const inMemoryReactions: Record<string, Record<ReactionType, number>> = {};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId');
    const idsParam = searchParams.get('ids');

    // Batch query for multiple articles in the Bento feed
    if (idsParam) {
      const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
      const results: Record<string, { upvote: number; downvote: number; comments: number }> = {};

      for (const id of ids) {
        const mem = inMemoryReactions[id] || {
          upvote: 0,
          downvote: 0,
          funny: 0,
          love: 0,
          surprised: 0,
          angry: 0,
          sad: 0,
        };
        results[id] = {
          upvote: mem.upvote || 0,
          downvote: mem.downvote || 0,
          comments: 0,
        };
      }

      // Check comments count for these articles if UUIDs or slugs
      try {
        const { data: dbComments } = await supabaseAdmin
          .from('comments')
          .select('article_id')
          .in('article_id', ids.slice(0, 30));

        if (dbComments) {
          dbComments.forEach((c: any) => {
            if (results[c.article_id]) {
              results[c.article_id].comments += 1;
            }
          });
        }
      } catch {}

      return NextResponse.json({ success: true, reactionsByArticle: results });
    }

    if (!articleId) {
      return NextResponse.json({ reactions: {} });
    }

    let reactions = inMemoryReactions[articleId] || {
      upvote: 0,
      downvote: 0,
      funny: 0,
      love: 0,
      surprised: 0,
      angry: 0,
      sad: 0,
    };

    try {
      const { data } = await supabaseAdmin
        .from('article_reactions')
        .select('*')
        .eq('article_id', articleId)
        .maybeSingle();

      if (data) {
        reactions = {
          upvote: data.upvote || 0,
          downvote: data.downvote || 0,
          funny: data.funny || 0,
          love: data.love || 0,
          surprised: data.surprised || 0,
          angry: data.angry || 0,
          sad: data.sad || 0,
        };
        inMemoryReactions[articleId] = reactions;
      }
    } catch {}

    return NextResponse.json({ reactions });
  } catch {
    return NextResponse.json({ reactions: {} });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { articleId, type, previousType } = body as {
      articleId: string;
      type?: ReactionType | null;
      previousType?: ReactionType | null;
    };

    if (!articleId) {
      return NextResponse.json({ error: 'articleId required' }, { status: 400 });
    }

    if (!inMemoryReactions[articleId]) {
      inMemoryReactions[articleId] = {
        upvote: 0,
        downvote: 0,
        funny: 0,
        love: 0,
        surprised: 0,
        angry: 0,
        sad: 0,
      };
    }

    const current = inMemoryReactions[articleId];

    if (previousType && current[previousType] !== undefined) {
      current[previousType] = Math.max(0, current[previousType] - 1);
    }

    if (type && current[type] !== undefined) {
      current[type] = (current[type] || 0) + 1;
    }

    try {
      await supabaseAdmin.from('article_reactions').upsert([
        {
          article_id: articleId,
          upvote: current.upvote,
          funny: current.funny,
          love: current.love,
          surprised: current.surprised,
          angry: current.angry,
          sad: current.sad,
          updated_at: new Date().toISOString(),
        },
      ]);
    } catch {}

    return NextResponse.json({ success: true, reactions: current });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
