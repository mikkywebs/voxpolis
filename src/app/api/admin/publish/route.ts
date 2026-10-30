import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCountryByCode, getCountrySlug } from '@/config/countries';
import { generateAiAnalysisSummary, generateCivicPollQuestion } from '@/lib/news';

export const dynamic = 'force-dynamic';

async function verifyAdminAuth(request: NextRequest): Promise<{ authorized: boolean; status?: number; error?: string; user?: any }> {
  try {
    const authHeader = request.headers.get('authorization');
    let user = null;

    // 1. Check Bearer token in Authorization header
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      const { data: userData, error: tokenErr } = await supabaseAdmin.auth.getUser(token);
      if (!tokenErr && userData?.user) {
        user = userData.user;
      }
    }

    // 2. Check cookies via Supabase SSR client
    if (!user) {
      try {
        const supabase = await createClient();
        const { data: cookieUserData, error: cookieErr } = await supabase.auth.getUser();
        if (!cookieErr && cookieUserData?.user) {
          user = cookieUserData.user;
        }
      } catch (cookieScopeErr) {
        // Expected when invoked outside Next.js request context or if cookies unavailable
      }
    }

    if (!user) {
      return { authorized: false, status: 401, error: 'Unauthorized: Authentication required' };
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.is_admin !== true) {
      return { authorized: false, status: 403, error: 'Forbidden: Administrator privileges required' };
    }

    return { authorized: true, user };
  } catch {
    return { authorized: false, status: 500, error: 'Authentication error' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }
    const body = await request.json();
    const {
      title,
      content,
      snippet,
      country_code = 'NG',
      image_url,
      category = 'politics',
      is_breaking = false,
      is_featured = true,
      tags = [],
      poll_question,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Article headline is required' }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'Article content is required' }, { status: 400 });
    }

    const cleanTitle = title.trim();
    // Leave title exactly as written by admin - never alter or force suffixes
    const displayTitle = cleanTitle;
    
    // Generate clean URL slug
    const baseSlug = cleanTitle
      .toLowerCase()
      .replace(/ - voxpolis$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 80);

    // Ensure uniqueness
    let slug = baseSlug;
    try {
      const { data: existing } = await supabaseAdmin
        .from('articles')
        .select('id, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        slug = `${baseSlug}-${Date.now().toString(36)}`;
      }
    } catch {}

    const countryObj = getCountryByCode(country_code.toUpperCase());
    const countryName = countryObj?.name || country_code.toUpperCase();
    const cleanSnippet = (snippet || content.slice(0, 220)).trim();

    const aiAnalysis = generateAiAnalysisSummary(
      cleanTitle,
      cleanSnippet,
      'Voxpolis',
      countryName
    );

    const tagList: string[] = Array.isArray(tags) && tags.length > 0 ? [...tags] : ['Politics', countryName, 'Voxpolis'];
    if (is_featured && !tagList.some((t) => /featured/i.test(t))) {
      tagList.unshift('Featured News');
    }
    if (is_breaking && !tagList.includes('Breaking')) {
      tagList.unshift('Breaking');
    }

    const articleData = {
      slug,
      title: displayTitle,
      snippet: cleanSnippet,
      content: content.trim(),
      ai_analysis: aiAnalysis || `• Strategic Perspective: Published report by Voxpolis Editorial Desk for ${countryName}.\n• Key Takeaway: Verified political news dispatch.`,
      country_code: country_code.toUpperCase(),
      language: 'en',
      category: category || 'politics',
      image_mode: 'original',
      original_image_url: image_url && image_url.trim() ? image_url.trim() : (is_breaking ? '/breaking-news-banner.png' : '/voxpolis-fallback-1.png'),
      source_name: 'Voxpolis',
      source_url: `https://voxpolis.app/news/${slug}`,
      is_breaking: !!is_breaking,
      tags: Array.from(new Set(tagList)),
      views_count: 0,
      total_reading_time_seconds: Math.max(120, Math.round(content.trim().split(/\s+/).length / 3)),
      created_at: new Date().toISOString(),
    };

    // Written by the editor in the admin page → counts as reviewed (indexable).
    let editorName = 'Voxpolis Editor';
    try {
      const editorId = (auth as any)?.user?.id;
      if (editorId) {
        const { data: prof } = await supabaseAdmin.from('profiles').select('full_name').eq('id', editorId).maybeSingle();
        if (prof?.full_name) editorName = prof.full_name;
      }
    } catch {}
    const reviewFields = { review_status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: editorName };

    const { data, error } = await supabaseAdmin
      .from('articles')
      .upsert({ ...articleData, ...reviewFields }, { onConflict: 'slug' })
      .select()
      .single();

    if (error) {
      console.error('Database insert error in admin/publish:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save article to database' },
        { status: 500 }
      );
    }

    // If admin explicitly provided a custom civic poll question, attach it to polls table
    if (poll_question && typeof poll_question === 'string' && poll_question.trim()) {
      try {
        const articleId = data?.id;
        if (articleId) {
          const { data: existingPoll } = await supabaseAdmin
            .from('polls')
            .select('id')
            .eq('article_id', articleId)
            .maybeSingle();

          if (existingPoll?.id) {
            await supabaseAdmin
              .from('polls')
              .update({ question: poll_question.trim() })
              .eq('id', existingPoll.id);
          } else {
            await supabaseAdmin
              .from('polls')
              .insert({
                article_id: articleId,
                question: poll_question.trim(),
                agree_count: 0,
                disagree_count: 0,
              });
          }
        }
      } catch (pollErr) {
        console.warn('Could not save poll for article:', pollErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Article successfully published live on Voxpolis!',
      article: data || articleData,
      slug,
      liveUrl: `/news/${slug}`,
      countrySlug: getCountrySlug(countryObj),
    });
  } catch (error: any) {
    console.error('Publish API exception:', error);
    return NextResponse.json(
      { success: false, error: 'Server error publishing article' },
      { status: 500 }
    );
  }
}
