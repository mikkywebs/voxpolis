import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCountryByCode, getCountrySlug } from '@/config/countries';
import { generateAiAnalysisSummary, generateCivicPollQuestion } from '@/lib/news';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      snippet,
      country_code = 'NG',
      image_url,
      category = 'politics',
      is_breaking = true,
      tags = [],
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Article headline is required' }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'Article content is required' }, { status: 400 });
    }

    const cleanTitle = title.trim();
    const displayTitle = cleanTitle.endsWith(' - Voxpolis') ? cleanTitle : `${cleanTitle} - Voxpolis`;
    
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

    const pollQuestion = generateCivicPollQuestion(cleanTitle, cleanSnippet);

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
      original_image_url: image_url || '/breaking-news-banner.png',
      source_name: 'Voxpolis',
      source_url: `https://voxpolis.app/news/${slug}`,
      is_breaking: !!is_breaking,
      tags: Array.isArray(tags) && tags.length > 0 ? tags : ['Politics', countryName, 'Voxpolis'],
      views_count: 0,
      total_reading_time_seconds: Math.max(120, Math.round(content.trim().split(/\s+/).length / 3)),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('articles')
      .upsert(articleData, { onConflict: 'slug' })
      .select()
      .single();

    if (error) {
      console.error('Database insert error in admin/publish:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to save article to database' },
        { status: 500 }
      );
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
      { success: false, error: error?.message || 'Server error publishing article' },
      { status: 500 }
    );
  }
}
