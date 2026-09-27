import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
      return NextResponse.json(data);
    }
  } catch (e) {
    console.error('Site settings endpoint error:', e);
  }

  // Fallback defaults
  return NextResponse.json({
    full_logo_url: '/voxpolis-logo-kit/01-original-full-lockup.png',
    icon_url: '/voxpolis-logo-kit/12-transparent-icon.png',
    light_logo_url: '/voxpolis-logo-kit/11-transparent-blog-header.png',
    dark_logo_url: '/voxpolis-logo-kit/04-blog-header-dark.jpg',
  });
}

export async function POST(req: Request) {
  try {
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
