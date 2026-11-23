'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { articlePath, toSlug } from '@/lib/paths';
import { ALL_COUNTRIES, getCountryByCode, getCountrySlug } from '@/config/countries';
import { checkStory, CheckItem } from '@/lib/editorial/prepublish';

/**
 * Voxpolis story editor (SEO layout).
 *   /admin/write          new story
 *   /admin/write?id=...   edit any story
 * Left: the story in the order Google reads it (H1 headline, summary, body with ## subheadings).
 * Right: publish box, section and web address, photo, Google listing and the live checklist.
 */

type Section = { heading: string; kind: string; paragraphs: string[] };
type Photo = { url: string; credit: string; license: string; pageUrl: string; subject: string };

const input =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const card = 'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4';
const label = 'block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1';
const WATCH = /^what to watch$/i;

/** lead + sections (+ what to watch) → one text with "## " subheadings */
function toBody(lead: string, sections: Section[], watch: string): string {
  const parts = [lead.trim()];
  sections.forEach((s) => parts.push(`## ${s.heading}\n\n${(s.paragraphs || []).join('\n\n')}`));
  if (watch.trim()) parts.push(`## What to watch\n\n${watch.trim()}`);
  return parts.filter(Boolean).join('\n\n');
}

/** one text → lead + sections + what to watch. Section types from older stories are kept by heading. */
function fromBody(body: string, kinds: Map<string, string>) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const lead: string[] = [];
  const sections: { heading: string; kind: string; text: string }[] = [];
  for (const line of lines) {
    const h = line.match(/^#{2,3}\s+(.+)$/);
    if (h) sections.push({ heading: h[1].trim(), kind: kinds.get(h[1].trim().toLowerCase()) || 'report', text: '' });
    else if (sections.length) sections[sections.length - 1].text += line + '\n';
    else lead.push(line);
  }
  let watch = '';
  const last = sections[sections.length - 1];
  if (last && WATCH.test(last.heading)) {
    watch = last.text.trim();
    sections.pop();
  }
  return { lead: lead.join('\n').trim(), sections: sections.map((s) => ({ ...s, text: s.text.trim() })), watch };
}

const paragraphsOf = (t: string) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const countWords = (t: string) => t.replace(/^#{2,3}\s+/gm, '').split(/\s+/).filter(Boolean).length;

function Counter({ n, min, max }: { n: number; min: number; max: number }) {
  const cls = n === 0 ? 'text-gray-400' : n < min || n > max ? 'text-amber-600' : 'text-emerald-600';
  return <span className={`font-normal normal-case tracking-normal ${cls}`}>{n}/{max}</span>;
}

function Editor() {
  const router = useRouter();
  const params = useSearchParams();
  const idParam = params.get('id') || '';

  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(!!idParam);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [id, setId] = useState(idParam);
  const [status, setStatus] = useState<'new' | 'pending' | 'approved' | 'archived' | 'rejected'>('new');
  const [meta, setMeta] = useState({ created_at: new Date().toISOString(), updated_at: '', origin: 'editor', editorial_version: 3, fidelity: null as any, source_facts: null as any, sources: [] as any[], source_url: '', new_reports_at: null as string | null, key_points: [] as string[] });
  const [checked, setChecked] = useState<string[]>([]);
  const kinds = useRef(new Map<string, string>());

  const [f, setF] = useState({
    title: '',
    dek: '',
    body: '',
    section: 'NG',
    category: 'politics',
    slug: '',
    poll: '',
    tags: '',
    image: '',
    credit: '',
    alt: '',
    license: '',
    pageUrl: '',
    seoTitle: '',
    desc: '',
    keyword: '',
  });
  const [slugTouched, setSlugTouched] = useState(!!idParam);
  const [sources, setSources] = useState<{ name: string; url: string }[]>([]);
  const setSource = (i: number, patch: Partial<{ name: string; url: string }>) => setSources((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  // ---------- auth + load ----------
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        setToken(data?.session?.access_token || null);
        setAuthChecked(true);
      });
  }, []);

  const load = useCallback(async () => {
    if (!token || !idParam) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/review?id=${encodeURIComponent(idParam)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not load the story');
      const a = d.article;
      kinds.current = new Map((a.sections || []).map((s: Section) => [s.heading.toLowerCase(), s.kind]));
      const sections: Section[] = Array.isArray(a.sections) ? a.sections : [];
      const lead = a.lead || (sections.length ? '' : a.content || '');
      setF({
        title: a.title || '',
        dek: a.dek || a.snippet || '',
        body: toBody(lead, sections, a.what_to_watch || ''),
        section: a.country_code || 'NG',
        category: a.category === 'opinion' ? 'opinion' : 'politics',
        slug: a.slug || '',
        poll: a.poll_question || '',
        tags: (a.tags || []).filter((t: string) => !/^by /i.test(t)).join(', '),
        image: a.original_image_url || '',
        credit: a.image_credit || '',
        alt: a.image_alt || '',
        license: a.image_license || '',
        pageUrl: a.image_page_url || '',
        seoTitle: a.seo_title || '',
        desc: a.meta_description || '',
        keyword: a.focus_keyword || '',
      });
      setSources(Array.isArray(a.sources) ? a.sources.map((x: any) => ({ name: x.name || '', url: x.url || '' })) : []);
      setStatus(a.review_status);
      setChecked(a.checked_items || []);
      setMeta({
        created_at: a.created_at,
        updated_at: a.updated_at || '',
        origin: a.origin || 'desk',
        editorial_version: a.editorial_version || 3,
        fidelity: a.fidelity,
        source_facts: a.source_facts,
        sources: a.sources || [],
        source_url: a.source_url || '',
        new_reports_at: a.new_reports_at,
        key_points: a.key_points || [],
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, idParam]);

  useEffect(() => {
    load();
  }, [load]);

  // Web address follows the headline until you edit it (drafts only).
  useEffect(() => {
    if (!slugTouched && status !== 'approved') set({ slug: toSlug(f.keyword && !f.title.toLowerCase().includes(f.keyword.toLowerCase()) ? `${f.keyword} ${f.title}` : f.title, 60) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.title, f.keyword, slugTouched, status]);

  // ---------- derived ----------
  const parsed = useMemo(() => fromBody(f.body, kinds.current), [f.body]);
  const words = countWords(f.body);
  const sectionObj = getCountryByCode(f.section);
  const live = useMemo(
    () =>
      checkStory({
        title: f.title,
        slug: f.slug,
        dek: f.dek,
        key_points: meta.key_points,
        lead: parsed.lead,
        sections: parsed.sections.map((s) => ({ heading: s.heading, kind: s.kind, paragraphs: paragraphsOf(s.text) })),
        what_to_watch: parsed.watch,
        sources: meta.sources,
        source_url: meta.source_url,
        source_facts: meta.source_facts,
        original_image_url: f.image,
        image_credit: f.credit,
        image_alt: f.alt,
        meta_description: f.desc,
        focus_keyword: f.keyword,
        checked_items: checked,
        review_status: status === 'new' ? 'pending' : status,
        new_reports_at: meta.new_reports_at,
        category: f.category,
        origin: meta.origin,
        editorial_version: meta.editorial_version,
        fidelity: meta.fidelity,
        created_at: meta.created_at,
        updated_at: new Date().toISOString(),
      }),
    [f, parsed, meta, checked, status]
  );
  const reds = live.items.filter((i) => i.level === 'stop');
  const ambers = live.items.filter((i) => i.level === 'check');
  const tips = live.items.filter((i) => i.level === 'tip');

  const googleTitle = (f.seoTitle || f.title || 'Your headline').trim();
  const googleDesc = (f.desc || f.dek).trim();

  // ---------- actions ----------
  const fields = () => ({
    title: f.title,
    dek: f.dek,
    slug: status === 'approved' ? undefined : f.slug,
    country_code: f.section,
    category: f.category,
    lead: parsed.lead,
    sections: parsed.sections,
    what_to_watch: parsed.watch,
    poll_question: f.poll,
    tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
    original_image_url: f.image,
    image_credit: f.credit,
    image_alt: f.alt,
    image_license: f.license,
    image_page_url: f.pageUrl,
    seo_title: f.seoTitle,
    meta_description: f.desc,
    focus_keyword: f.keyword,
    sources: cleanSources(),
  });

  const validUrl = (u: string) => /^https?:\/\/[^\s]+\.[^\s]+/.test(u.trim());
  const cleanSources = () =>
    sources
      .filter((x) => validUrl(x.url))
      .map((x) => {
        let name = x.name.trim();
        if (!name) {
          try {
            name = new URL(x.url.trim()).hostname.replace(/^www\./, '');
          } catch {}
        }
        return { name, url: x.url.trim() };
      });

  const call = async (body: any) => {
    const res = await fetch('/api/admin/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Something went wrong');
    return d;
  };

  const run = async (action: 'save' | 'approve' | 'reopen' | 'archive' | 'reject') => {
    setErr('');
    setMsg('');
    if (f.title.trim().length < 20) return setErr('Write the headline first (at least 20 characters).');
    if (!parsed.lead) return setErr('Write the opening paragraph before the first "##" subheading.');
    if (parsed.sections.some((s) => !s.text)) return setErr('Every "##" subheading needs text under it.');
    if (sources.some((x) => x.url.trim() && !validUrl(x.url))) return setErr('A source link is not a full web address. It must start with https://');
    setBusy(action);
    try {
      let storyId = id;
      if (!storyId) {
        const created = await call({ action: 'create', title: f.title, country_code: f.section, category: f.category });
        storyId = created.id;
        setId(storyId);
        setStatus('pending');
        router.replace(`/admin/write?id=${storyId}`);
      }
      if (action === 'save' || action === 'approve') await call({ id: storyId, action, fields: fields() });
      else await call({ id: storyId, action });
      const next = action === 'approve' ? 'approved' : action === 'reopen' ? 'pending' : action === 'archive' ? 'archived' : action === 'reject' ? 'rejected' : status === 'new' ? 'pending' : status;
      setStatus(next as any);
      setMeta((m) => ({ ...m, updated_at: new Date().toISOString() }));
      setMsg(
        action === 'approve'
          ? status === 'approved' ? 'Changes are live.' : 'Published. It is now live on Voxpolis.'
          : action === 'reopen' ? 'Unpublished. It is a draft again.'
          : action === 'archive' ? 'Archived. The link still opens, but Google is told not to index it.'
          : action === 'reject' ? 'Discarded.'
          : 'Draft saved.'
      );
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };

  const confirmItem = async (key: string) => {
    if (!id) return setErr('Save the draft first, then you can mark items as correct.');
    try {
      const d = await call({ id, action: 'confirm', key });
      setChecked(d.checked_items || []);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  // ---------- photo ----------
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setUploading(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload-image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const d = await res.json();
      if (!res.ok || !d.imageUrl || String(d.imageUrl).startsWith('data:')) throw new Error(d.error || 'Upload failed. Try again.');
      set({ image: d.imageUrl, credit: '', license: '', pageUrl: '' });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUploading(false);
    }
  };
  const [ph, setPh] = useState({ open: false, query: '', busy: false, results: [] as Photo[], note: '' });
  const findPhotos = async (q: string) => {
    if (!id) return setPh((x) => ({ ...x, open: true, note: 'Save the draft first, then search for a photo.' }));
    setPh((x) => ({ ...x, open: true, busy: true, note: '' }));
    try {
      const d = await call({ id, action: 'photos', query: q });
      setPh((x) => ({ ...x, busy: false, results: d.photos || [], note: (d.photos || []).length ? '' : 'No licensed photos found. Try another name or place.' }));
    } catch (e: any) {
      setPh((x) => ({ ...x, busy: false, note: e.message }));
    }
  };

  // ---------- body helpers ----------
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const addSubheading = () => {
    const el = bodyRef.current;
    const pos = el ? el.selectionStart : f.body.length;
    const before = f.body.slice(0, pos).replace(/\s*$/, '');
    const after = f.body.slice(pos).replace(/^\s*/, '');
    const insert = `${before ? before + '\n\n' : ''}## Subheading\n\n`;
    set({ body: insert + after });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const start = insert.length - '\n\n'.length - 'Subheading'.length;
      el.setSelectionRange(start, start + 'Subheading'.length);
    });
  };

  // ---------- render ----------
  if (authChecked && !token) {
    return (
      <main className="max-w-md mx-auto p-8 text-center space-y-4">
        <h1 className="text-xl font-black">Story editor</h1>
        <p className="text-sm text-gray-600">Sign in with your editor account.</p>
        <Link href="/login?redirect=/admin/write" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm">
          Sign in
        </Link>
      </main>
    );
  }
  if (loading) return <main className="p-8 text-sm text-gray-500">Loading story…</main>;

  const live_url = status === 'approved' || status === 'archived' ? articlePath({ slug: f.slug, country_code: f.section }) : '';
  const statusLabel = { new: 'New story', pending: 'Draft', approved: 'Published', archived: 'Archived', rejected: 'Discarded' }[status];

  const Item = ({ i }: { i: CheckItem }) => (
    <li className="flex gap-2 text-xs leading-snug">
      <span aria-hidden="true" className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i.level === 'stop' ? 'bg-red-600' : i.level === 'check' ? 'bg-amber-500' : 'bg-gray-300'}`} />
      <span className="min-w-0">
        {i.text}
        {i.how && (
          <details className="mt-0.5">
            <summary className="cursor-pointer text-blue-600">How do I check?</summary>
            <span className="block text-gray-500 mt-1">{i.how}</span>
          </details>
        )}
        {i.key && (
          <button type="button" onClick={() => confirmItem(i.key!)} className="mt-1 block text-emerald-700 font-bold">
            ✓ It&apos;s correct
          </button>
        )}
      </span>
    </li>
  );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/review" className="text-sm text-blue-600 hover:underline">
              ← Newsroom
            </Link>
            <h1 className="text-xl font-black">{id ? 'Edit story' : 'Write a story'}</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 dark:bg-gray-800">{statusLabel}</span>
          </div>
          {live_url && (
            <Link href={live_url} target="_blank" className="text-sm text-blue-600 hover:underline">
              View live ↗
            </Link>
          )}
        </header>

        {err && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">{err}</div>}
        {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-2" role="status">{msg}</div>}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
          {/* ================= LEFT: the story ================= */}
          <div className="space-y-4 min-w-0">
            <div className={card}>
              <label className={label} htmlFor="title">
                Headline (H1) · <Counter n={f.title.length} min={40} max={70} />
              </label>
              <textarea
                id="title"
                rows={2}
                className="w-full bg-transparent text-2xl sm:text-3xl font-black leading-tight focus:outline-none resize-none"
                placeholder="Who did what: Tinubu signs 2027 budget into law"
                value={f.title}
                onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })}
              />
            </div>

            <div className={card}>
              <label className={label} htmlFor="dek">
                Summary line (under the headline) · <Counter n={f.dek.length} min={80} max={200} />
              </label>
              <textarea
                id="dek"
                rows={2}
                className="w-full bg-transparent text-base text-gray-700 dark:text-gray-300 focus:outline-none resize-none"
                placeholder="One sentence: what happened and why it matters."
                value={f.dek}
                onChange={(e) => set({ dek: e.target.value.replace(/\n/g, ' ') })}
              />
            </div>

            <div className={card}>
              <div className="flex items-center justify-between mb-2">
                <span className={label + ' mb-0'}>
                  Story · <span className={`font-normal normal-case tracking-normal ${words < 300 ? 'text-amber-600' : 'text-emerald-600'}`}>{words} words</span>
                </span>
                <button type="button" onClick={addSubheading} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200">
                  + Subheading (H2)
                </button>
              </div>
              <textarea
                ref={bodyRef}
                rows={24}
                className="w-full bg-transparent text-[16px] leading-relaxed focus:outline-none resize-y font-serif"
                placeholder={'Opening paragraph: who, what, when, where. Put your focus keyword here.\n\nSecond paragraph…\n\n## A subheading\n\nMore paragraphs…\n\n## What to watch\n\nWhat happens next.'}
                value={f.body}
                onChange={(e) => set({ body: e.target.value })}
              />
              <p className="text-[11px] text-gray-500 mt-2">
                Leave an empty line between paragraphs. A line starting with <code>## </code> becomes a subheading. A last subheading called
                &quot;What to watch&quot; becomes the closing box.
              </p>
            </div>

            <div className={card + ' grid gap-3 sm:grid-cols-2'}>
              <div>
                <label className={label} htmlFor="poll">Reader poll question (optional)</label>
                <input id="poll" className={input} placeholder="Should the budget be passed as it is?" value={f.poll} onChange={(e) => set({ poll: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor="tags">Tags (comma separated)</label>
                <input id="tags" className={input} placeholder="Tinubu, 2027 budget, National Assembly" value={f.tags} onChange={(e) => set({ tags: e.target.value })} />
              </div>
            </div>

            <div className={card + ' space-y-3'}>
              <div className="flex items-center justify-between">
                <span className={label + ' mb-0'}>Sources (shown at the end of the story)</span>
                <button
                  type="button"
                  onClick={() => setSources((all) => [...all, { name: '', url: '' }])}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"
                >
                  + Add source
                </button>
              </div>
              {sources.length === 0 && (
                <p className="text-xs text-gray-500">Link the statement, document or report your story is based on. Readers and Google trust stories that show their sources.</p>
              )}
              {sources.map((x, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_auto] items-start">
                  <input className={input} aria-label={`Source ${i + 1} name`} placeholder="Name, e.g. State House" value={x.name} onChange={(e) => setSource(i, { name: e.target.value })} />
                  <input
                    className={`${input} ${x.url.trim() && !validUrl(x.url) ? 'border-red-400' : ''}`}
                    aria-label={`Source ${i + 1} link`}
                    placeholder="https://statehouse.gov.ng/news/..."
                    value={x.url}
                    onChange={(e) => setSource(i, { url: e.target.value })}
                  />
                  <button type="button" onClick={() => setSources((all) => all.filter((_, j) => j !== i))} className="px-2 py-2 text-xs font-bold text-red-600">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ================= RIGHT: publish + SEO ================= */}
          <aside className="space-y-4 lg:sticky lg:top-4">
            <div className={card + ' space-y-3'}>
              <div className="flex items-center justify-between">
                <span className="font-black">Publish</span>
                <span className={`text-xs font-bold ${reds.length ? 'text-red-700' : ambers.length ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {reds.length ? `${reds.length} to fix` : ambers.length ? `${ambers.length} to check` : 'Ready'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!!busy} onClick={() => run('save')} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-bold disabled:opacity-50">
                  {busy === 'save' ? 'Saving…' : status === 'approved' ? 'Save' : 'Save draft'}
                </button>
                <button
                  type="button"
                  disabled={!!busy || reds.length > 0}
                  title={reds.length ? 'Fix the red items first' : undefined}
                  onClick={() => run('approve')}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-40"
                >
                  {busy === 'approve' ? 'Publishing…' : status === 'approved' ? 'Update live story' : 'Publish'}
                </button>
              </div>
              {status !== 'new' && (
                <div className="flex flex-wrap gap-3 text-xs">
                  {status === 'approved' && (
                    <button type="button" onClick={() => run('reopen')} className="text-gray-600 hover:underline">Unpublish</button>
                  )}
                  {(status === 'approved' || status === 'pending') && (
                    <button type="button" onClick={() => run('archive')} className="text-gray-600 hover:underline">Archive</button>
                  )}
                  {(status === 'archived' || status === 'rejected') && (
                    <button type="button" onClick={() => run('reopen')} className="text-gray-600 hover:underline">Move to drafts</button>
                  )}
                  {status === 'pending' && (
                    <button type="button" onClick={() => run('reject')} className="text-red-600 hover:underline">Discard</button>
                  )}
                </div>
              )}
              {(reds.length > 0 || ambers.length > 0 || tips.length > 0) && (
                <ul className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                  {[...reds, ...ambers, ...tips].map((i, n) => <Item key={`${i.field}-${n}`} i={i} />)}
                </ul>
              )}
            </div>

            <div className={card + ' space-y-3'}>
              <div>
                <span className={label}>Section</span>
                <div className="flex gap-1.5">
                  {ALL_COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => set({ section: c.code })}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-sm font-bold ${f.section === c.code ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className={label}>Type</span>
                <div className="flex gap-1.5">
                  {[['politics', 'News'], ['opinion', 'Opinion']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set({ category: v })} className={`flex-1 px-2 py-1.5 rounded-lg text-sm font-bold ${f.category === v ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={label} htmlFor="slug">Web address</label>
                <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden text-sm">
                  <span className="px-2 text-gray-500 bg-gray-50 dark:bg-gray-800 py-2 shrink-0">/{getCountrySlug(sectionObj)}/</span>
                  <input
                    id="slug"
                    className="min-w-0 flex-1 bg-transparent px-2 py-2 font-mono text-xs focus:outline-none disabled:text-gray-500"
                    value={f.slug}
                    disabled={status === 'approved'}
                    onChange={(e) => (setSlugTouched(true), set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">{status === 'approved' ? 'Locked after publishing (changing it would hurt Google ranking).' : '3-6 key words. Locked once published.'}</p>
              </div>
            </div>

            <div className={card + ' space-y-2'}>
              <span className={label}>Featured photo</span>
              {f.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.image} alt={f.alt || ''} className="w-full aspect-[1200/630] rounded-lg object-cover object-top" />
              ) : (
                <div className="w-full aspect-[1200/630] rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-400 flex items-center justify-center">No photo yet</div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                <label className="px-3 py-1.5 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold cursor-pointer">
                  {uploading ? 'Uploading…' : f.image ? 'Replace' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
                <button type="button" onClick={() => findPhotos(ph.query || f.keyword || f.title.split(' ').slice(0, 3).join(' '))} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 font-bold">
                  Find a free photo
                </button>
                {f.image && (
                  <button type="button" onClick={() => set({ image: '', credit: '', alt: '', license: '', pageUrl: '' })} className="px-2 text-red-600 font-bold">
                    Remove
                  </button>
                )}
              </div>
              {ph.open && (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      className={input}
                      placeholder="A name, place or topic"
                      value={ph.query}
                      onChange={(e) => setPh((x) => ({ ...x, query: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), findPhotos(ph.query))}
                    />
                    <button type="button" disabled={ph.busy} onClick={() => findPhotos(ph.query)} className="px-3 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-bold disabled:opacity-50">
                      {ph.busy ? '…' : 'Search'}
                    </button>
                  </div>
                  {ph.note && <p className="text-xs text-gray-500">{ph.note}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    {ph.results.map((p) => (
                      <button
                        key={p.url}
                        type="button"
                        onClick={() => set({ image: p.url, credit: p.credit, license: p.license, pageUrl: p.pageUrl, alt: f.alt || p.subject })}
                        className={`rounded-lg overflow-hidden border text-left ${f.image === p.url ? 'border-emerald-500 ring-2 ring-emerald-400' : 'border-gray-200 dark:border-gray-800'}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={p.subject} className="w-full h-20 object-cover object-top" loading="lazy" />
                        <span className="block p-1 text-[10px] text-gray-500 line-clamp-2">{p.credit}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className={label} htmlFor="alt">Alt text (what the photo shows)</label>
                <input id="alt" className={input} placeholder="President Tinubu signing the budget at the Villa" value={f.alt} onChange={(e) => set({ alt: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor="credit">Credit</label>
                <input id="credit" className={input} placeholder="Photo: State House / Voxpolis" value={f.credit} onChange={(e) => set({ credit: e.target.value })} />
              </div>
            </div>

            <div className={card + ' space-y-3'}>
              <span className={label}>Google listing</span>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-950">
                <p className="text-[12px] text-gray-600 dark:text-gray-400 truncate">voxpolis.app › {getCountrySlug(sectionObj)} › {f.slug || 'web-address'}</p>
                <p className="text-[17px] leading-snug text-[#1a0dab] dark:text-[#8ab4f8] line-clamp-1">
                  {googleTitle.length > 60 ? googleTitle.slice(0, 57).trimEnd() + '…' : googleTitle} | Voxpolis
                </p>
                <p className="text-[13px] text-gray-700 dark:text-gray-300 line-clamp-2">
                  {googleDesc ? (googleDesc.length > 160 ? googleDesc.slice(0, 157).trimEnd() + '…' : googleDesc) : 'Write a description so Google shows what the story is about.'}
                </p>
              </div>
              <div>
                <label className={label} htmlFor="kw">Focus keyword</label>
                <input id="kw" className={input} placeholder="2027 budget" value={f.keyword} onChange={(e) => set({ keyword: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor="seot">
                  Google title (optional) · <Counter n={(f.seoTitle || f.title).length} min={30} max={60} />
                </label>
                <input id="seot" className={input} placeholder={f.title || 'Leave empty to use the headline'} value={f.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} />
              </div>
              <div>
                <label className={label} htmlFor="desc">
                  Google description · <Counter n={(f.desc || f.dek).length} min={120} max={160} />
                </label>
                <textarea id="desc" rows={3} className={input} placeholder={f.dek || 'One or two sentences with the focus keyword.'} value={f.desc} onChange={(e) => set({ desc: e.target.value })} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-gray-500">Loading…</main>}>
      <Editor />
    </Suspense>
  );
}
