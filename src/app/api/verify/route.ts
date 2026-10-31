import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyArticle } from '@/lib/editorial/verify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Accuracy check runner. Called every 10 minutes by Supabase pg_cron (voxpolis-verify).
 *   GET /api/verify   Header: Authorization: Bearer <CRON_SECRET>
 * Checks up to 2 drafts that have not been checked yet (newest first).
 */
export async function GET(req: NextRequest) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from('articles')
    .select('id, slug')
    .eq('review_status', 'pending')
    .is('fidelity', null)
    .gte('editorial_version', 3)
    .eq('origin', 'desk')
    .order('created_at', { ascending: false })
    .limit(2);

  const started = Date.now();
  const done: { slug: string; status: string; issues: number }[] = [];
  for (const row of data || []) {
    if (Date.now() - started > 25_000) break;
    try {
      const r = await verifyArticle(row.id);
      done.push({ slug: row.slug, status: r.status, issues: r.issues.length });
    } catch (e: any) {
      done.push({ slug: row.slug, status: `error: ${e?.message || e}`, issues: 0 });
    }
  }
  return NextResponse.json({ checked: done });
}
