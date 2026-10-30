'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getCountryByCode } from '@/config/countries';

type Status = 'pending' | 'approved' | 'rejected';

interface Story {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  snippet: string | null;
  key_points: string[] | null;
  content: string;
  analysis: string | null;
  ai_analysis: string | null;
  background: string | null;
  what_next: string | null;
  country_code: string;
  source_name: string;
  source_url: string;
  importance: number | null;
  original_image_url: string | null;
  image_credit: string | null;
  image_page_url: string | null;
  created_at: string;
  review_status: Status;
  reviewed_by: string | null;
  poll_question: string;
}

const inputCls =
  'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500';

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

function StoryEditor({ story, onDone, token }: { story: Story; onDone: (msg: string) => void; token: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({
    title: story.title || '',
    dek: story.dek || story.snippet || '',
    key_points: (story.key_points || []).join('\n'),
    content: story.content || '',
    analysis: story.analysis || '',
    background: story.background || '',
    what_next: story.what_next || '',
    poll_question: story.poll_question || '',
  });
  const country = getCountryByCode(story.country_code);
  const words = f.content.split(/\s+/).filter(Boolean).length;

  const act = async (action: string) => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: story.id,
          action,
          fields: { ...f, key_points: f.key_points.split('\n').map((k) => k.trim()).filter(Boolean) },
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      onDone(
        action === 'approve' ? 'Approved. Google can now find this story.' : action === 'reject' ? 'Rejected and hidden.' : action === 'remove_photo' ? 'Photo removed.' : action === 'reopen' ? 'Moved back to review.' : 'Saved.'
      );
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof f, label: string, rows: number, hint?: string) => (
    <label className="block space-y-1">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
      {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
      {rows === 1 ? (
        <input className={inputCls} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
      ) : (
        <textarea className={inputCls} rows={rows} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
      )}
    </label>
  );

  return (
    <article className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="font-bold text-gray-800 dark:text-gray-200">
          {country.flag} {country.name}
        </span>
        {story.importance != null && (
          <span className={`px-2 py-0.5 rounded-full font-bold ${story.importance >= 8 ? 'bg-red-100 text-red-700' : story.importance >= 6 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
            Importance {story.importance}/10
          </span>
        )}
        <span>{ago(story.created_at)}</span>
        <a href={story.source_url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
          Original: {story.source_name} ↗
        </a>
        <Link href={`/news/${story.slug}`} target="_blank" className="text-blue-600 hover:underline">
          View on site ↗
        </Link>
        {story.reviewed_by && <span>Reviewed by {story.reviewed_by}</span>}
      </div>

      <div className="flex gap-3">
        {story.original_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.original_image_url} alt="" className="w-24 h-24 sm:w-32 sm:h-24 rounded-xl object-cover object-top shrink-0" />
        )}
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-black leading-snug">{f.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{f.dek}</p>
          {story.image_credit && <p className="text-[11px] text-gray-400 mt-1">{story.image_credit}</p>}
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-900 dark:text-amber-200">
        Before approving: open the original, check names, numbers and dates, and make sure the analysis is fair to all sides.
      </div>

      {open && (
        <div className="space-y-3 pt-1">
          {field('title', 'Headline', 1)}
          {field('dek', 'Summary line', 2)}
          {field('key_points', 'The short version', 5, 'One point per line')}
          {field('content', `Story (${words} words)`, 14)}
          {field('analysis', 'What it means', 7)}
          {field('background', 'Background', 4)}
          {field('what_next', 'What happens next', 3)}
          {field('poll_question', 'Reader question (leave empty for none)', 1, 'Only for a real public choice. Neutral, agree/disagree.')}
          {story.original_image_url && (
            <button type="button" disabled={busy} onClick={() => act('remove_photo')} className="text-xs font-bold text-red-600 hover:underline">
              Remove photo (wrong person or place)
            </button>
          )}
        </div>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        {story.review_status !== 'approved' && (
          <button type="button" disabled={busy} onClick={() => act('approve')} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
            ✓ Approve
          </button>
        )}
        <button type="button" onClick={() => setOpen(!open)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold">
          {open ? 'Close editor' : '✎ Edit'}
        </button>
        {open && (
          <button type="button" disabled={busy} onClick={() => act('save')} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50">
            Save edits
          </button>
        )}
        {story.review_status === 'pending' && (
          <button type="button" disabled={busy} onClick={() => act('reject')} className="px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-red-300 text-red-600 text-sm font-bold disabled:opacity-50">
            ✕ Reject
          </button>
        )}
        {story.review_status !== 'pending' && (
          <button type="button" disabled={busy} onClick={() => act('reopen')} className="px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 text-sm font-bold disabled:opacity-50">
            Move back to review
          </button>
        )}
      </div>
    </article>
  );
}

export default function ReviewPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<Status>('pending');
  const [stories, setStories] = useState<Story[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editor, setEditor] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setToken(data?.session?.access_token || null);
        setChecked(true);
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
      setStories(d.articles);
      setCounts(d.counts || {});
      setEditor(d.editor || '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, status]);

  useEffect(() => {
    load();
  }, [load]);

  if (checked && !token) {
    return (
      <main className="max-w-md mx-auto p-8 text-center space-y-4">
        <h1 className="text-xl font-black">Editor review</h1>
        <p className="text-sm text-gray-600">Please sign in with your editor account.</p>
        <Link href="/login?redirect=/admin/review" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <header className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-black">Editor review</h1>
            <Link href="/admin" className="text-sm text-blue-600 hover:underline">
              Admin home
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            New stories are readable on the site but hidden from Google and ads until you approve them.
            {editor && <> You are reviewing as <strong>{editor}</strong>.</>}
          </p>
        </header>

        <nav className="flex gap-2">
          {(['pending', 'approved', 'rejected'] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize ${status === s ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'}`}
            >
              {s === 'pending' ? 'To review' : s} {counts[s] != null && <span className="opacity-60">({counts[s]})</span>}
            </button>
          ))}
        </nav>

        {toast && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2" role="status">
            {toast}
          </div>
        )}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">{error}</div>}
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && !error && stories.length === 0 && (
          <p className="text-sm text-gray-500 py-10 text-center">{status === 'pending' ? 'Nothing waiting. Nice work.' : 'No stories here yet.'}</p>
        )}

        <div className="space-y-4">
          {stories.map((s) => (
            <StoryEditor
              key={`${s.id}-${s.review_status}`}
              story={s}
              token={token || ''}
              onDone={(msg) => {
                setToast(msg);
                setTimeout(() => setToast(''), 4000);
                load();
              }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
