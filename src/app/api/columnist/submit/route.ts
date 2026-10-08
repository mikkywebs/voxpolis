import { NextRequest, NextResponse } from 'next/server';
import { saveColumnistSubmission, ColumnistSubmission } from '@/lib/columnist';

export const dynamic = 'force-dynamic';

const FORBIDDEN_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'nigger', 'faggot', 'kill yourself', 'retard'
];

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_WORDS.some((w) => lower.includes(w));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      author_name,
      author_email,
      author_bio,
      author_avatar,
      country_code,
      title,
      content,
      featured_image_url,
    } = body;

    if (!author_name || !author_email || !title || !content || !country_code) {
      return NextResponse.json(
        { success: false, error: 'Please fill in all required columnist fields.' },
        { status: 400 }
      );
    }

    const wordCount = countWords(content);
    if (wordCount < 500) {
      return NextResponse.json(
        {
          success: false,
          error: `Editorial standards require a minimum of 500 words for columnist op-eds. Current word count: ${wordCount}.`,
        },
        { status: 400 }
      );
    }

    if (containsProfanity(title) || containsProfanity(content)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Submission declined: Abusive, profane, or indecent language is strictly prohibited under Voxpolis editorial standards.',
        },
        { status: 400 }
      );
    }

    const cleanTitle = title.trim();
    const slug = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 80);

    const submission: ColumnistSubmission = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      author_name: author_name.trim(),
      author_email: author_email.trim().toLowerCase(),
      author_bio: (author_bio || '').trim(),
      author_avatar: (author_avatar || '/breaking-news-banner.png').trim(),
      country_code: country_code.toUpperCase(),
      title: cleanTitle,
      slug,
      snippet: content.trim().slice(0, 240) + '...',
      content: content.trim(),
      featured_image_url: (featured_image_url || '/voxpolis-fallback-1.png').trim(),
      word_count: wordCount,
      status: 'pending_review',
      created_at: new Date().toISOString(),
    };

    const saved = saveColumnistSubmission(submission);
    if (!saved) {
      return NextResponse.json({ success: false, error: 'Failed to record submission' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Your op-ed has been submitted for editorial review. Once approved by the administrator, it will be published to the live national feed.',
      submissionId: submission.id,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { getAllColumnistSubmissions } = await import('@/lib/columnist');
    const items = getAllColumnistSubmissions();
    return NextResponse.json({ success: true, submissions: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
