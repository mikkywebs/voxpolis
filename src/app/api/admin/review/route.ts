import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin/auth';
import { getCountryByCode, getCountrySlug } from '@/config/countries';
import { articlePath, isValidSlug, toSlug } from '@/lib/paths';
import { verifyArticle } from '@/lib/editorial/verify';
import { checkStory } from '@/lib/editorial/prepublish';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Editor review queue.
 *   GET  /api/admin/review?status=pending|approved|rejected
 *   POST /api/admin/review { id, action: 'save'|'approve'|'reject'|'reopen'|'remove_photo', fields? }
 * Admin only (profiles.is_admin).
 */

const FIELDS =
  'id, slug, title, dek, snippet, key_points, content, analysis, ai_analysis, background, what_next, country_code, source_name, source_url, importance, original_image_url, image_credit, image_page_url, created_at, review_status, reviewed_by, reviewed_at, story_type, lead, sections, what_to_watch, sources, source_facts, meta_description, checked_items, new_reports_at, fidelity, origin, category, editorial_version, updated_at';

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const status = req.nextUrl.searchParams.get('status') || 'pending';
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select(FIELDS)
    .eq('review_status', status)
    .order(status === 'pending' ? 'importance' : 'reviewed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (data || []).map((a: any) => a.id);
  const { data: polls } = ids.length
    ? await supabaseAdmin.from('polls').select('article_id, question').in('article_id', ids)
    : { data: [] as any[] };
  const pollMap = new Map((polls || []).map((p: any) => [p.article_id, p.question]));

  const { data: counts } = await supabaseAdmin.from('articles').select('review_status');
  const tally = { pending: 0, approved: 0, rejected: 0 } as Record<string, number>;
  (counts || []).forEach((r: any) => (tally[r.review_status] = (tally[r.review_status] || 0) + 1));

  return NextResponse.json({
    editor: auth.name,
    counts: tally,
    // source_facts go to the browser too, so the checker can run live while the editor types.
    articles: (data || []).map((a: any) => ({ ...a, poll_question: pollMap.get(a.id) || '', checks: checkStory(a) })),
  });
}

function clean(s: unknown, max: number): string | undefined {
  if (typeof s !== 'string') return undefined;
  return s.replace(/\r\n/g, '\n').trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || '');
  const action = String(body?.action || '');
  // The editor's own story: create an empty draft, then write it in the normal editor (with all the checks).
  if (action === 'create') {
    const country = getCountryByCode(String(body?.country_code || 'NG').toUpperCase());
    const title = clean(body?.title, 160) || '';
    if (title.length < 20) return NextResponse.json({ error: 'Write a working headline first (at least 20 characters).' }, { status: 400 });
    let slug = toSlug(title, 60) || 'voxpolis-story';
    for (let i = 2; i < 50; i++) {
      const { data: taken } = await supabaseAdmin.from('articles').select('id').or(`slug.eq.${slug},previous_slug.eq.${slug}`).limit(1);
      if (!taken?.length) break;
      slug = `${toSlug(title, 56)}-${i}`;
    }
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert({
        slug,
        title,
        snippet: '',
        dek: '',
        content: '',
        ai_analysis: '',
        lead: '',
        sections: [],
        key_points: [],
        sources: [],
        country_code: country.code,
        language: 'en',
        category: body?.category === 'opinion' ? 'opinion' : 'politics',
        source_name: 'Voxpolis',
        source_url: '',
        image_mode: 'breaking_logo',
        review_status: 'pending',
        origin: 'editor',
        editorial_version: 3,
        status: 'published',
        created_at: now,
        updated_at: now,
      })
      .select('id, slug')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id, slug: data.slug });
  }

  if (!id || !['save', 'approve', 'reject', 'reopen', 'remove_photo', 'confirm', 'unconfirm', 'verify'].includes(action)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { data: current } = await supabaseAdmin.from('articles').select('id, slug, country_code, review_status, checked_items').eq('id', id).maybeSingle();
  if (!current) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

  // Run the AI accuracy check now (takes 10-30 seconds).
  if (action === 'verify') {
    try {
      const fidelity = await verifyArticle(id);
      return NextResponse.json({ ok: true, fidelity });
    } catch (e: any) {
      return NextResponse.json({ error: `Accuracy check failed: ${e?.message || e}` }, { status: 500 });
    }
  }

  // "It's correct" on an amber check (and undo). Saved straight away, without touching other edits.
  if (action === 'confirm' || action === 'unconfirm') {
    const key = String(body?.key || '').slice(0, 300);
    if (!key) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    const list = new Set<string>(current.checked_items || []);
    if (action === 'confirm') list.add(key);
    else list.delete(key);
    const checked_items = Array.from(list).slice(-200);
    const { error } = await supabaseAdmin.from('articles').update({ checked_items }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, checked_items });
  }

  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  const f = body?.fields || {};

  if (action === 'save' || action === 'approve') {
    const title = clean(f.title, 160);
    const dek = clean(f.dek, 400);
    const content = clean(f.content, 20000);
    const analysis = clean(f.analysis, 8000);
    if (title !== undefined) {
      if (title.length < 20) return NextResponse.json({ error: 'Headline is too short.' }, { status: 400 });
      update.title = title;
    }
    if (dek !== undefined) {
      update.dek = dek;
      update.snippet = dek;
    }
    if (content !== undefined) {
      if (content.split(/\s+/).length < 120) return NextResponse.json({ error: 'Story text is too short.' }, { status: 400 });
      update.content = content;
    }
    if (analysis !== undefined) {
      update.analysis = analysis;
      update.ai_analysis = analysis;
    }
    // Web address: editable while it's a draft; locked once published (changing live addresses hurts ranking).
    if (typeof f.slug === 'string' && f.slug.trim() && f.slug.trim() !== current.slug) {
      const slug = f.slug.trim().toLowerCase();
      if (current.review_status === 'approved') return NextResponse.json({ error: 'The web address of a published story cannot be changed.' }, { status: 400 });
      if (!isValidSlug(slug)) return NextResponse.json({ error: 'Web address: use 8-80 lowercase letters, numbers and hyphens only.' }, { status: 400 });
      const { data: taken } = await supabaseAdmin.from('articles').select('id').or(`slug.eq.${slug},previous_slug.eq.${slug}`).neq('id', id).limit(1);
      if (taken && taken.length) return NextResponse.json({ error: 'That web address is already used by another story.' }, { status: 400 });
      update.slug = slug;
    }
    // Flexible structure (v3): opening paragraphs, story-specific sections, what to watch.
    if (typeof f.lead === 'string') update.lead = clean(f.lead, 4000);
    if (Array.isArray(f.sections)) {
      const KINDS = ['report', 'response', 'context', 'analysis', 'reaction', 'numbers'];
      const sections = f.sections
        .map((x: any) => ({
          heading: clean(x?.heading, 120) || '',
          kind: KINDS.includes(x?.kind) ? x.kind : 'report',
          paragraphs: (typeof x?.text === 'string' ? x.text : Array.isArray(x?.paragraphs) ? x.paragraphs.join('\n\n') : '')
            .split(/\n\s*\n/)
            .map((p: string) => p.trim())
            .filter(Boolean)
            .slice(0, 12),
        }))
        .filter((x: any) => x.paragraphs.length > 0)
        .slice(0, 8);
      if (sections.some((x: any) => !x.heading)) return NextResponse.json({ error: 'Every section needs a subheading.' }, { status: 400 });
      update.sections = sections;
      // Keep the plain-text copies in step (search, older pages, checks).
      const leadText = typeof f.lead === 'string' ? f.lead : '';
      update.content = [leadText, ...sections.filter((x: any) => x.kind !== 'analysis').flatMap((x: any) => x.paragraphs)].filter(Boolean).join('\n\n');
      update.analysis = sections.filter((x: any) => x.kind === 'analysis').flatMap((x: any) => x.paragraphs).join('\n\n');
      update.ai_analysis = update.analysis;
    }
    if (typeof f.what_to_watch === 'string') {
      update.what_to_watch = clean(f.what_to_watch, 600) || null;
      update.what_next = update.what_to_watch;
    }
    const bg = clean(f.background, 2000);
    if (bg !== undefined) update.background = bg;
    const next = clean(f.what_next, 2000);
    if (next !== undefined) update.what_next = next;
    if (Array.isArray(f.key_points)) {
      update.key_points = f.key_points.map((k: unknown) => clean(k, 300)).filter(Boolean).slice(0, 6);
    }

    // Featured image chosen by the editor: an upload to our own storage, a Wikimedia photo, or none.
    if (typeof f.original_image_url === 'string') {
      const url = f.original_image_url.trim();
      const ours = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/article-images\//.test(url);
      const commons = /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(url);
      if (!url) {
        Object.assign(update, { original_image_url: null, image_credit: null, image_license: null, image_page_url: null, image_mode: 'breaking_logo' });
      } else if (ours || commons) {
        update.original_image_url = url;
        update.image_mode = 'original';
        if (ours) {
          update.image_license = null;
          update.image_page_url = null;
        }
      } else {
        return NextResponse.json({ error: 'Images must be uploaded here (or come from Wikimedia Commons).' }, { status: 400 });
      }
    }
    // Sources: the reports, statements or documents the story is based on.
    if (Array.isArray(f.sources)) {
      const list = f.sources
        .map((x: any) => ({ name: clean(x?.name, 80) || '', url: String(x?.url || '').trim().slice(0, 500) }))
        .filter((x: any) => /^https?:\/\/[^\s]+\.[^\s]+/.test(x.url))
        .map((x: any) => ({ name: x.name || new URL(x.url).hostname.replace(/^www\./, ''), url: x.url }))
        .slice(0, 8);
      update.sources = list;
      if (list[0]) {
        update.source_url = list[0].url;
        update.source_name = list[0].name;
      }
    }
    if (typeof f.meta_description === 'string') update.meta_description = clean(f.meta_description, 200) || null;
    if (typeof f.image_credit === 'string') update.image_credit = f.image_credit.trim().slice(0, 160) || null;

    if (typeof f.poll_question === 'string') {
      const q = f.poll_question.trim().slice(0, 240);
      const { data: poll } = await supabaseAdmin.from('polls').select('id').eq('article_id', id).maybeSingle();
      if (!q && poll) await supabaseAdmin.from('polls').delete().eq('id', poll.id);
      else if (q && poll) await supabaseAdmin.from('polls').update({ question: q }).eq('id', poll.id);
      else if (q) await supabaseAdmin.from('polls').insert({ article_id: id, question: q, agree_count: 0, disagree_count: 0 });
    }
  }

  if (action === 'reject') update.review_status = 'rejected';
  if (action === 'reopen') {
    update.review_status = 'pending';
    update.reviewed_at = null;
    update.reviewed_by = null;
  }
  if (action === 'remove_photo') {
    Object.assign(update, { original_image_url: null, image_credit: null, image_license: null, image_page_url: null, image_mode: 'breaking_logo' });
  }

  const { error } = await supabaseAdmin.from('articles').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Publish: edits are saved above; publish only if the saved story has no red items.
  if (action === 'approve') {
    const { data: saved } = await supabaseAdmin.from('articles').select(FIELDS).eq('id', id).maybeSingle();
    const result = saved ? checkStory(saved as any) : null;
    if (!result || result.level === 'stop') {
      const first = result?.items.find((i) => i.level === 'stop')?.text;
      return NextResponse.json({ error: `Your edits are saved, but the story was not published. Fix the red items first.${first ? ' ' + first : ''}` }, { status: 400 });
    }
    const { error: pubErr } = await supabaseAdmin
      .from('articles')
      .update({ review_status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: auth.name })
      .eq('id', id);
    if (pubErr) return NextResponse.json({ error: pubErr.message }, { status: 500 });
  }

  // Refresh the public pages that show this story.
  try {
    revalidatePath(articlePath({ slug: update.slug || current.slug, country_code: current.country_code }));
    revalidatePath(`/${getCountrySlug(getCountryByCode(current.country_code))}`);
    revalidatePath('/');
    revalidatePath('/sitemap.xml');
  } catch {}

  return NextResponse.json({ ok: true, action, slug: current.slug });
}
