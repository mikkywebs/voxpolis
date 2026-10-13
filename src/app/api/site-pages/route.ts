import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const filePath = path.join(process.cwd(), 'src/config/sitePages.json');

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

function getFallbackPageData(pageKey?: string | null): Record<string, any> | null {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const all = JSON.parse(raw);
      if (pageKey) {
        return all[pageKey] || null;
      }
      return all;
    }
  } catch {}
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageKey = searchParams.get('page');

    // 1. Primary source of truth: Supabase public.site_pages
    try {
      if (pageKey) {
        const { data: row, error } = await supabaseAdmin
          .from('site_pages')
          .select('page_key, data, updated_at')
          .eq('page_key', pageKey)
          .maybeSingle();

        if (!error && row && row.data) {
          return NextResponse.json({ success: true, data: row.data });
        }
      } else {
        const { data: rows, error } = await supabaseAdmin
          .from('site_pages')
          .select('page_key, data, updated_at');

        if (!error && Array.isArray(rows) && rows.length > 0) {
          const combined: Record<string, any> = {};
          for (const r of rows) {
            if (r.page_key && r.data) {
              combined[r.page_key] = r.data;
            }
          }
          return NextResponse.json({ success: true, data: combined });
        }
      }
    } catch (dbErr) {
      console.warn('[SitePages] Supabase read error, using bundled baseline:', dbErr);
    }

    // 2. Read-only bootstrap baseline (if table not yet migrated or row not yet populated)
    const fallback = getFallbackPageData(pageKey);
    if (fallback) {
      return NextResponse.json({ success: true, data: fallback });
    }

    return NextResponse.json({ success: false, error: 'Pages configuration not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load page configuration' }, { status: 500 });
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
    const { page, data } = body || {};

    if (!page || !data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'Missing page or data payload' }, { status: 400 });
    }

    const ALLOWED_PAGE_KEYS = new Set(['about', 'privacy', 'terms', 'contact', 'corrections']);
    if (typeof page !== 'string' || !ALLOWED_PAGE_KEYS.has(page)) {
      return NextResponse.json({ success: false, error: 'Invalid CMS page key' }, { status: 400 });
    }

    // Fetch existing page data from Supabase (or baseline fallback)
    let existingPageData: Record<string, any> = {};
    try {
      const { data: existingRow } = await supabaseAdmin
        .from('site_pages')
        .select('data')
        .eq('page_key', page)
        .maybeSingle();

      if (existingRow && existingRow.data && typeof existingRow.data === 'object') {
        existingPageData = existingRow.data;
      } else {
        const baseline = getFallbackPageData(page);
        if (baseline && typeof baseline === 'object') {
          existingPageData = baseline;
        }
      }
    } catch {
      const baseline = getFallbackPageData(page);
      if (baseline && typeof baseline === 'object') {
        existingPageData = baseline;
      }
    }

    const mergedData = {
      ...existingPageData,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Persist durably to Supabase public.site_pages
    const { error: upsertErr } = await supabaseAdmin
      .from('site_pages')
      .upsert(
        {
          page_key: page,
          data: mergedData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'page_key' }
      );

    if (upsertErr) {
      console.error('[SitePages] Failed to persist page to Supabase:', upsertErr.message);
      return NextResponse.json({ success: false, error: 'Failed to update page configuration in database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Page ${page} updated successfully`, data: mergedData });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update page configuration' }, { status: 500 });
  }
}
