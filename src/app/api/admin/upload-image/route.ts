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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    const ALLOWED_MIME_TO_EXT: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };

    const mimeType = (file.type || '').toLowerCase();
    const safeExt = ALLOWED_MIME_TO_EXT[mimeType];
    if (!safeExt) {
      return NextResponse.json(
        { success: false, error: 'Uploaded file must be a valid JPEG, PNG, WebP, or GIF image' },
        { status: 400 }
      );
    }

    const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
    if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Image file size must not exceed 5 MB' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Image file size must not exceed 5 MB' },
        { status: 400 }
      );
    }

    const filename = `voxpolis-news-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${safeExt}`;

    // 1. Try uploading to Supabase Storage bucket 'article-images'
    try {
      const { data: storageData, error: storageErr } = await supabaseAdmin.storage
        .from('article-images')
        .upload(filename, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!storageErr && storageData?.path) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('article-images')
          .getPublicUrl(storageData.path);

        if (publicUrlData?.publicUrl) {
          return NextResponse.json({
            success: true,
            imageUrl: publicUrlData.publicUrl,
            storage: 'supabase',
          });
        }
      }
    } catch (e) {
      console.warn('Supabase storage upload fallback to base64:', e);
    }

    // 2. Base64 data URL fallback (guaranteed to work across all deployments without extra bucket setup)
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      imageUrl: dataUrl,
      storage: 'inline',
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
