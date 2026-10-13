import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
      } catch {
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

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('site_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('Supabase site_settings error:', error);
    }

    if (data) {
      return NextResponse.json({
        ...data,
        full_logo_url: data.full_logo_url?.includes('/voxpolis-logo-kit/') ? '/voxpolis-logo-light.png' : (data.full_logo_url || '/voxpolis-logo-light.png'),
        light_logo_url: data.light_logo_url?.includes('/voxpolis-logo-kit/') ? '/voxpolis-logo-light.png' : (data.light_logo_url || '/voxpolis-logo-light.png'),
        dark_logo_url: (data.dark_logo_url?.includes('/voxpolis-logo-kit/') || data.dark_logo_url?.endsWith('.jpg')) ? '/voxpolis-logo-dark.png' : (data.dark_logo_url || '/voxpolis-logo-dark.png'),
        icon_url: data.icon_url?.includes('/voxpolis-logo-kit/') ? '/voxpolis-icon.png' : (data.icon_url || '/voxpolis-icon.png'),
      });
    }
  } catch (e) {
    console.error('Site settings endpoint error:', e);
  }

  // Fallback defaults
  return NextResponse.json({
    full_logo_url: '/voxpolis-logo-light.png',
    icon_url: '/voxpolis-icon.png',
    light_logo_url: '/voxpolis-logo-light.png',
    dark_logo_url: '/voxpolis-logo-dark.png',
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const body = await req.json();
    const { full_logo_url, icon_url, light_logo_url, dark_logo_url } = body;

    const { data: existing } = await supabaseAdmin.from('site_settings').select('id').single();

    let result;
    if (existing?.id) {
      result = await supabaseAdmin
        .from('site_settings')
        .update({
          full_logo_url,
          icon_url,
          light_logo_url,
          dark_logo_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabaseAdmin
        .from('site_settings')
        .insert([{ full_logo_url, icon_url, light_logo_url, dark_logo_url }])
        .select()
        .single();
    }

    return NextResponse.json(result.data || { success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update site settings' }, { status: 500 });
  }
}
