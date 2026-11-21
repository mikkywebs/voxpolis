'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { articlePath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/client';
import { getCountryByCode } from '@/config/countries';
import type { CheckResult } from '@/lib/editorial/prepublish';

/**
 * Newsroom: every story in one list. Click a story to open it in the full-page editor (/admin/write).
 */

type Status = 'pending' | 'approved' | 'archived' | 'rejected';

interface Row {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  country_code: string;
  original_image_url: string | null;
  created_at: string;
  reviewed_at: string | null;
  review_status: Status;
  origin: string | null;
  focus_keyword: string | null;
  checks: CheckResult;
}

const TABS: [Status, string][] = [
  ['pending', 'Drafts'],
  ['approved', 'Published'],
  ['archived', 'Archived'],
  ['rejected', 'Discarded'],
];

function when(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function NewsroomPage() {
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [status, setStatus] = useState<Status>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setToken(data?.session?.access_token || null);
        setAuthChecked(true);
      });
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/review?status=${status}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not load stories');
      setRows(d.articles || []);
      setCounts(d.counts || {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, status]);

  useEffect(() => {
    load();
  }, [load]);

  if (authChecked && !token) {
    return (
      <main className="max-w-md mx-auto p-8 text-center space-y-4">
        <h1 className="text-xl font-black">Newsroom</h1>
        <p className="text-sm text-gray-600">Sign in with your editor account.</p>
        <Link href="/login?redirect=/admin/review" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm">
          Sign in
        </Link>
      </main>
    );
  }

  const shown = rows.filter((r) => !q.trim() || r.title.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">Newsroom</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Nothing appears on Voxpolis until you press Publish.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-blue-600 hover:underline">
              Admin home
            </Link>
            <Link href="/admin/write" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm">
              + Write new story
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          {TABS.map(([s, l]) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded-xl text-sm font-bold ${status === s ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'}`}
            >
              {l} {counts[s] != null && <span className="opacity-60">({counts[s]})</span>}
            </button>
          ))}
          <input
            className="ml-auto w-full sm:w-56 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
            placeholder="Search headlines"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">{error}</div>}
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && !error && shown.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-gray-500">{status === 'pending' ? 'No drafts. Start your next story.' : 'No stories here.'}</p>
            {status === 'pending' && (
              <Link href="/admin/write" className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm">
                Write new story
              </Link>
            )}
          </div>
        )}

        <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          {shown.map((r) => {
            const reds = r.checks?.items.filter((i) => i.level === 'stop').length || 0;
            const ambers = r.checks?.items.filter((i) => i.level === 'check').length || 0;
            return (
              <li key={r.id} className="flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {r.original_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.original_image_url} alt="" className="w-20 h-14 rounded-lg object-cover object-top shrink-0" />
                ) : (
                  <div className="w-20 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/write?id=${r.id}`} className="font-bold leading-snug hover:underline line-clamp-2">
                    {r.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{getCountryByCode(r.country_code).name}</span>
                    <span>{when(r.reviewed_at || r.created_at)}</span>
                    {r.origin === 'editor' && <span className="text-blue-700">Your story</span>}
                    {reds > 0 ? (
                      <span className="text-red-700 font-bold">{reds} to fix</span>
                    ) : ambers > 0 ? (
                      <span className="text-amber-700 font-bold">{ambers} to check</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">Ready</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs shrink-0">
                  <Link href={`/admin/write?id=${r.id}`} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 font-bold">
                    Edit
                  </Link>
                  {(r.review_status === 'approved' || r.review_status === 'archived') && (
                    <Link href={articlePath(r)} target="_blank" className="text-blue-600 hover:underline">
                      View ↗
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
