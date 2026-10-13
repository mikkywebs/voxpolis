import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCountryByCode, getCountrySlug } from '@/config/countries';

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

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country');

    let query = supabaseAdmin
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (countryCode && countryCode !== 'ALL') {
      query = query.eq('country_code', countryCode.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching admin articles:', error);
      return NextResponse.json({ success: false, error: 'Failed to list published articles' }, { status: 500 });
    }

    const articles = (data || []).map((art) => {
      const cObj = getCountryByCode(art.country_code || 'NG');
      return {
        id: art.id,
        slug: art.slug,
        title: art.title,
        snippet: art.snippet,
        content: art.content,
        country_code: art.country_code,
        country_name: cObj?.name || art.country_code,
        country_flag: cObj?.flag || '🌐',
        country_slug: getCountrySlug(cObj),
        source_name: art.source_name || 'Voxpolis',
        source_url: art.source_url || `/news/${art.slug}`,
        original_image_url: art.original_image_url || undefined,
        views_count: art.views_count || 0,
        is_breaking: art.is_breaking || false,
        is_featured: (art.tags && Array.isArray(art.tags) && art.tags.some((t: string) => /featured/i.test(t))) || false,
        tags: art.tags || [],
        created_at: art.created_at,
        live_url: `/news/${art.slug}`,
      };
    });

    return NextResponse.json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to list published articles' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    if (!id && !slug) {
      return NextResponse.json(
        { success: false, error: 'id or slug is required to delete an article' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin.from('articles').delete();
    if (id) {
      query = query.eq('id', id);
    } else if (slug) {
      query = query.eq('slug', slug);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to delete article' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Article successfully removed from database',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
