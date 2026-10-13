import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { saveColumnistSubmission, ColumnistSubmission } from '@/lib/columnist';
import { getCountryByCode } from '@/config/countries';

export const dynamic = 'force-dynamic';

const FORBIDDEN_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'nigger', 'faggot', 'kill yourself', 'retard'
];

// Per-IP rate limiter for public columnist submissions (max 5 submissions per 15 minutes)
const SUBMIT_WINDOW_MS = 15 * 60 * 1000;
const SUBMIT_MAX_REQUESTS = 5;
const submitIpLog = new Map<string, number[]>();

function checkSubmitRateLimit(request: NextRequest): boolean {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip')?.trim() || 'unknown-ip');
  const now = Date.now();
  const recent = (submitIpLog.get(ip) || []).filter((t) => now - t < SUBMIT_WINDOW_MS);
  if (recent.length >= SUBMIT_MAX_REQUESTS) {
    submitIpLog.set(ip, recent);
    return false;
  }
  recent.push(now);
  submitIpLog.set(ip, recent);
  if (submitIpLog.size > 1000) {
    const firstKey = submitIpLog.keys().next().value;
    if (firstKey) submitIpLog.delete(firstKey);
  }
  return true;
}

async function verifyAdminAuth(request: NextRequest): Promise<{ authorized: boolean; status?: number; error?: string; user?: any }> {
  try {
    const authHeader = request.headers.get('authorization');
    let user = null;

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      const { data: userData, error: tokenErr } = await supabaseAdmin.auth.getUser(token);
      if (!tokenErr && userData?.user) {
        user = userData.user;
      }
    }

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

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_WORDS.some((w) => lower.includes(w));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(request: NextRequest) {
  try {
    if (!checkSubmitRateLimit(request)) {
      return NextResponse.json(
        { success: false, error: 'Too many submissions. Please wait before submitting again.' },
        { status: 429 }
      );
    }

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

    if (
      typeof author_name !== 'string' ||
      typeof author_email !== 'string' ||
      typeof title !== 'string' ||
      typeof content !== 'string' ||
      typeof country_code !== 'string' ||
      !author_name.trim() ||
      !author_email.trim() ||
      !title.trim() ||
      !content.trim() ||
      !country_code.trim()
    ) {
      return NextResponse.json(
        { success: false, error: 'Please fill in all required columnist fields.' },
        { status: 400 }
      );
    }

    const cleanEmail = author_email.trim().toLowerCase();
    if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (author_name.trim().length > 120 || title.trim().length > 300 || content.length > 60000) {
      return NextResponse.json(
        { success: false, error: 'One or more fields exceed maximum allowed length.' },
        { status: 400 }
      );
    }

    const normalizedCountry = country_code.trim().toUpperCase();
    const matchedCountry = getCountryByCode(normalizedCountry);
    if (!matchedCountry || matchedCountry.code !== normalizedCountry) {
      return NextResponse.json(
        { success: false, error: 'Invalid country code provided.' },
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
      author_email: cleanEmail,
      author_bio: typeof author_bio === 'string' ? author_bio.trim().slice(0, 1000) : '',
      author_avatar: typeof author_avatar === 'string' && author_avatar.trim() ? author_avatar.trim().slice(0, 500) : '/breaking-news-banner.png',
      country_code: normalizedCountry,
      title: cleanTitle,
      slug,
      snippet: content.trim().slice(0, 240) + '...',
      content: content.trim(),
      featured_image_url:
        typeof featured_image_url === 'string' && featured_image_url.trim()
          ? /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(featured_image_url.trim())
            ? featured_image_url.trim().slice(0, 7_000_000)
            : featured_image_url.trim().slice(0, 2048)
          : '/voxpolis-fallback-1.png',
      word_count: wordCount,
      status: 'pending_review',
      created_at: new Date().toISOString(),
    };

    const saved = await saveColumnistSubmission(submission);
    if (!saved) {
      return NextResponse.json({ success: false, error: 'Failed to record submission' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Your op-ed has been submitted for editorial review. Once approved by the administrator, it will be published to the live national feed.',
      submissionId: submission.id,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to process submission' }, { status: 500 });
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

    const { getAllColumnistSubmissions } = await import('@/lib/columnist');
    const items = await getAllColumnistSubmissions();
    return NextResponse.json({ success: true, submissions: items });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load submissions' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const body = await request.json();
    const { id, status } = body || {};

    if (!id || typeof id !== 'string' || !['published', 'declined'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid submission ID and status ("published" or "declined") required' },
        { status: 400 }
      );
    }

    const { updateSubmissionStatus } = await import('@/lib/columnist');
    const updated = await updateSubmissionStatus(id, status);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Failed to update submission status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Submission marked as ${status}` });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update submission' }, { status: 500 });
  }
}
