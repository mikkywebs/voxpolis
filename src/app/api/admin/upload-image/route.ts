import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
    }

    const mimeType = file.type || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Uploaded file must be an image' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `voxpolis-news-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

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
      { success: false, error: error?.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
