import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getDesk, COVERAGE } from '@/config/coverage';
import { runDesk } from '@/lib/editorial/ingest';
import { getCountryByCode, getCountrySlug } from '@/config/countries';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Runs ONE coverage desk.
 *   GET /api/ingest?desk=NG
 *   Header: Authorization: Bearer <CRON_SECRET>
 * Vercel Cron sends that header automatically when CRON_SECRET is set.
 * GitHub Actions calls this hourly for every desk (see .github/workflows/ingest.yml).
 */
export async function GET(req: NextRequest) {
  const secret = (process.env.CRON_SECRET || '').trim();
  const auth = req.headers.get('authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const code = (req.nextUrl.searchParams.get('desk') || '').toUpperCase();
  if (code === 'LIST') {
    return NextResponse.json({ desks: COVERAGE.map((d) => ({ code: d.code, tier: d.tier })) });
  }
  const desk = getDesk(code);
  if (!desk) return NextResponse.json({ error: `Unknown desk "${code}"` }, { status: 400 });

  const maxParam = Number(req.nextUrl.searchParams.get('max'));
  const report = await runDesk(desk, { max: maxParam > 0 ? Math.min(maxParam, 5) : undefined, deadlineMs: 57_000 });

  if (report.published > 0) {
    revalidatePath('/');
    const countries = new Set(report.outcomes.filter((o) => o.outcome === 'published' && o.country).map((o) => o.country!));
    countries.forEach((c) => revalidatePath(`/${getCountrySlug(getCountryByCode(c))}`));
  }

  return NextResponse.json(report);
}
