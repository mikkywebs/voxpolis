'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { articlePath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/client';
import { getCountryByCode, ALL_COUNTRIES } from '@/config/countries';
import { checkStory, fieldLevel, CheckItem, CheckResult } from '@/lib/editorial/prepublish';
import type { SourceFacts } from '@/lib/editorial/facts';

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
  story_type: string | null;
  lead: string | null;
  sections: { heading: string; kind: string; paragraphs: string[] }[] | null;
  what_to_watch: string | null;
  sources: { name: string; url: string }[] | null;
  checks: CheckResult;
  source_facts: SourceFacts | null;
  meta_description: string | null;
  checked_items: string[] | null;
  new_reports_at: string | null;
  updated_at: string | null;
  fidelity: any;
  origin: string | null;
  category: string | null;
  editorial_version: number | null;
}

const DOT: Record<'red' | 'amber' | 'green', string> = { red: 'bg-red-600', amber: 'bg-amber-500', green: 'bg-emerald-500' };
const WORD: Record<'red' | 'amber' | 'green', string> = { red: 'Fix', amber: 'Check', green: 'OK' };

function Light({ level }: { level: 'red' | 'amber' | 'green' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold normal-case tracking-normal ${level === 'red' ? 'text-red-700' : level === 'amber' ? 'text-amber-700' : 'text-emerald-700'}`}>
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${DOT[level]}`} />
      {WORD[level]}
    </span>
  );
}

/** The problems found in one part of the story, each with "How do I check?" and "It's correct". */
const canAutoFix = (i: CheckItem) => i.level !== 'tip' && !['photo', 'sources', 'story'].includes(i.field) && !/^(photo|facts|newreports):/.test(i.key || '');

function FieldChecks({
  result,
  field,
  onConfirm,
  onFix,
  fixing = false,
}: {
  result: CheckResult;
  field: string;
  onConfirm: (key: string, undo?: boolean) => void;
  onFix?: (items: CheckItem[]) => void;
  fixing?: boolean;
}) {
  const open = result.items.filter((i) => i.field === field);
  const done = result.confirmed.filter((i) => i.field === field);
  if (!open.length && !done.length) return null;
  const row = (i: CheckItem, k: number, confirmed = false) => (
    <li key={k} className="flex gap-2">
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${confirmed ? 'bg-emerald-500' : i.level === 'stop' ? 'bg-red-600' : i.level === 'check' ? 'bg-amber-500' : 'bg-gray-400'}`}
      />
      <div className="min-w-0 space-y-1">
        <p className={confirmed ? 'text-gray-500 line-through decoration-gray-300' : i.level === 'stop' ? 'text-red-800 dark:text-red-300 font-semibold' : i.level === 'check' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500'}>
          <span className="sr-only">{confirmed ? 'Confirmed: ' : i.level === 'stop' ? 'Must fix: ' : i.level === 'check' ? 'Check: ' : 'Tip: '}</span>
          {i.text}
        </p>
        {!confirmed && i.how && (
          <details className="text-gray-600 dark:text-gray-400">
            <summary className="cursor-pointer text-blue-600 font-semibold">How do I check?</summary>
            <p className="mt-1">{i.how}</p>
          </details>
        )}
        {!confirmed && onFix && canAutoFix(i) && (
          <button
            type="button"
            disabled={fixing}
            onClick={() => onFix([i])}
            className="mr-2 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50"
          >
            ✨ Fix it for me
          </button>
        )}
        {i.key && (
          <button
            type="button"
            onClick={() => onConfirm(i.key!, confirmed)}
            className={`text-xs font-bold ${confirmed ? 'text-gray-500 hover:underline' : 'px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'}`}
          >
            {confirmed ? 'Undo' : "✓ It's correct"}
          </button>
        )}
      </div>
    </li>
  );
  return (
    <ul className="rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-3 space-y-2.5 text-[13px] leading-snug">
      {open.map((i, k) => row(i, k))}
      {done.map((i, k) => row(i, 100 + k, true))}
    </ul>
  );
}

interface EditSection {
  heading: string;
  kind: string;
  text: string;
}

const KIND_LABELS: Record<string, string> = {
  report: 'What happened',
  response: 'The other side',
  context: 'Context',
  analysis: 'Analysis (labelled on the page)',
  reaction: 'Reactions',
  numbers: 'Numbers',
};

const inputCls =
  'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500';

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

function StoryEditor({ story, onDone, token, autoOpen = false }: { story: Story; onDone: (msg: string) => void; token: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const [fidelity, setFidelity] = useState<any>(story.fidelity || null);
  const [verifying, setVerifying] = useState(false);
  const [srcText, setSrcText] = useState((story.sources?.length ? story.sources : story.source_url ? [{ name: story.source_name, url: story.source_url }] : []).map((x) => `${x.name} | ${x.url}`).join('\n'));
  const srcList = () =>
    srcText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^(.*?)\s*\|\s*(https?:\/\/\S+)$/) || l.match(/^()(https?:\/\/\S+)$/);
        return m ? { name: (m[1] || '').trim(), url: m[2] } : null;
      })
      .filter(Boolean) as { name: string; url: string }[];
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
    slug: story.slug || '',
    original_image_url: story.original_image_url || '',
    image_credit: story.image_credit || '',
    meta_description: story.meta_description || '',
    image_license: '',
    image_page_url: '',
    country_code: story.country_code,
  });
  const [checked, setChecked] = useState<string[]>(story.checked_items || []);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Flexible structure (v3 stories)
  const flexible = (story.editorial_version || 0) >= 3 || (Array.isArray(story.sections) && story.sections.length + (story.lead ? 1 : 0) > 0);
  const [lead, setLead] = useState(story.lead || '');
  const [secs, setSecs] = useState<EditSection[]>(
    (story.sections || []).map((x) => ({ heading: x.heading, kind: x.kind, text: (x.paragraphs || []).join('\n\n') }))
  );
  const [watch, setWatch] = useState(story.what_to_watch || '');
  const setSec = (i: number, patch: Partial<EditSection>) => setSecs((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const moveSec = (i: number, d: number) =>
    setSecs((all) => {
      const j = i + d;
      if (j < 0 || j >= all.length) return all;
      const copy = [...all];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  // The checker runs live on what is in the editor right now.
  const live = useMemo(
    () =>
      checkStory({
        ...story,
        title: f.title,
        slug: f.slug,
        dek: f.dek,
        key_points: f.key_points.split('\n').map((k) => k.trim()).filter(Boolean),
        lead: flexible ? lead : null,
        sections: flexible ? secs.map((x) => ({ heading: x.heading, kind: x.kind, paragraphs: x.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) })) : null,
        what_to_watch: flexible ? watch : null,
        content: f.content,
        analysis: f.analysis,
        background: f.background,
        what_next: f.what_next,
        original_image_url: f.original_image_url,
        image_credit: f.image_credit,
        meta_description: f.meta_description,
        checked_items: checked,
        sources: srcList(),
        fidelity,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [story, f, lead, secs, watch, checked, flexible, srcText, fidelity]
  );
  const confirm = async (key: string, undo = false) => {
    setErr('');
    const before = checked;
    setChecked((c) => (undo ? c.filter((k) => k !== key) : Array.from(new Set([...c, key]))));
    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: story.id, action: undo ? 'unconfirm' : 'confirm', key }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save');
      setChecked(d.checked_items || []);
    } catch (e: any) {
      setChecked(before);
      setErr(e.message);
    }
  };
  const lv = (field: string) => fieldLevel(live, field);

  // ---- "Fix it for me" ----
  const [fixing, setFixing] = useState(false);
  const [fixMsg, setFixMsg] = useState<{ changes: { before: string; after: string; reason: string }[]; unresolved: string[]; verified: number } | null>(null);
  const [undoSnap, setUndoSnap] = useState<any>(null);
  const [after, setAfter] = useState<'' | 'save' | 'verify'>('');
  const storyPayload = () =>
    flexible
      ? {
          title: f.title,
          dek: f.dek,
          key_points: f.key_points.split('\n').map((k) => k.trim()).filter(Boolean),
          meta_description: f.meta_description,
          lead: lead.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
          sections: secs.map((x) => ({ heading: x.heading, kind: x.kind, paragraphs: x.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) })),
          what_to_watch: watch,
        }
      : {
          title: f.title,
          dek: f.dek,
          key_points: f.key_points.split('\n').map((k) => k.trim()).filter(Boolean),
          meta_description: f.meta_description,
          content: f.content,
          analysis: f.analysis,
          background: f.background,
          what_next: f.what_next,
        };
  const autoFix = async (items: CheckItem[]) => {
    if (!items.length) return;
    setFixing(true);
    setErr('');
    setFixMsg(null);
    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: story.id, action: 'autofix', story: storyPayload(), problems: items.map((i) => ({ key: i.key, field: i.field, text: i.text })) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not fix it automatically');
      setUndoSnap({ f, lead, secs, watch });
      const x = d.fields;
      setF((prev) => ({
        ...prev,
        title: x.title ?? prev.title,
        dek: x.dek ?? prev.dek,
        key_points: (x.key_points || []).join('\n') || prev.key_points,
        meta_description: x.meta_description ?? prev.meta_description,
        ...(flexible ? {} : { content: x.content ?? prev.content, analysis: x.analysis ?? prev.analysis, background: x.background ?? prev.background, what_next: x.what_next ?? prev.what_next }),
      }));
      if (flexible) {
        setLead((x.lead || []).join('\n\n'));
        setSecs((x.sections || []).map((y: any) => ({ heading: y.heading, kind: y.kind, text: (y.paragraphs || []).join('\n\n') })));
        setWatch(x.what_to_watch || '');
      }
      if (Array.isArray(d.checked_items)) setChecked(d.checked_items);
      setFixMsg({ changes: d.changes || [], unresolved: d.unresolved || [], verified: (d.verified || []).length });
      setOpen(true);
      // Save the fixed story; after "Fix all", also run the accuracy check again on the new text.
      setAfter(items.length > 1 && (story.sources?.length || 0) > 0 ? 'verify' : 'save');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setFixing(false);
    }
  };
  const undoFix = () => {
    if (!undoSnap) return;
    setF(undoSnap.f);
    setLead(undoSnap.lead);
    setSecs(undoSnap.secs);
    setWatch(undoSnap.watch);
    setUndoSnap(null);
    setFixMsg(null);
    setAfter('save');
  };
  const fixableItems = live.items.filter(canAutoFix);

  // ---- "Find a free photo" (Wikimedia Commons, licensed for reuse). Nothing changes until "Use this photo". ----
  const [ph, setPh] = useState<{ open: boolean; busy: boolean; query: string; results: any[]; searched: string[]; note: string; suggestions: string[] }>({
    open: false,
    busy: false,
    query: '',
    results: [],
    searched: [],
    note: '',
    suggestions: [],
  });
  const findPhotos = async (query = '') => {
    setPh((x) => ({ ...x, open: true, busy: true, note: '' }));
    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: story.id, action: 'photos', query }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Search failed');
      setPh((x) => ({
        ...x,
        busy: false,
        results: d.photos || [],
        searched: d.subjects || [],
        suggestions: d.suggestions || x.suggestions,
        note: (d.photos || []).length ? '' : (d.subjects || []).length ? 'No free photo found. Try other words, e.g. a full name, a place, or a topic like "Iran flag", or leave the Voxpolis card.' : 'Type the name of the main person or place and press Search.',
      }));
    } catch (e: any) {
      setPh((x) => ({ ...x, busy: false, note: e.message }));
    }
  };
  const runVerify = async () => {
    setVerifying(true);
    setErr('');
    try {
      // Save first so the check reads the latest text.
      await act('save', true);
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: story.id, action: 'verify' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Accuracy check failed');
      setFidelity(d.fidelity);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!after) return;
    const what = after;
    setAfter('');
    if (what === 'verify') runVerify();
    else act('save', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [after]);

  const upload = async (file: File) => {
    setUploading(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload-image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const d = await res.json();
      if (!res.ok || !d.imageUrl) throw new Error(d.error || 'Upload failed');
      if (String(d.imageUrl).startsWith('data:')) throw new Error('Image storage is not available. Please try again later.');
      setF((prev) => ({ ...prev, original_image_url: d.imageUrl, image_credit: '' }));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUploading(false);
    }
  };
  const country = getCountryByCode(story.country_code);
  const words = (flexible ? [lead, ...secs.map((x) => x.text)].join(' ') : f.content).split(/\s+/).filter(Boolean).length;

  const act = async (action: string, quiet = false) => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: story.id,
          action,
          fields: flexible
            ? {
                title: f.title,
                dek: f.dek,
                slug: f.slug,
                poll_question: f.poll_question,
                original_image_url: f.original_image_url,
                image_credit: f.image_credit,
                meta_description: f.meta_description,
                country_code: f.country_code,
                image_license: f.image_license,
                image_page_url: f.image_page_url,
                sources: srcList(),
                key_points: f.key_points.split('\n').map((k) => k.trim()).filter(Boolean),
                lead,
                sections: secs,
                what_to_watch: watch,
              }
            : { ...f, sources: srcList(), key_points: f.key_points.split('\n').map((k) => k.trim()).filter(Boolean) },
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      if (quiet) return;
      onDone(
        action === 'approve' ? 'Published. The story is now live on Voxpolis.' : action === 'reject' ? 'Discarded.' : action === 'remove_photo' ? 'Photo removed.' : action === 'reopen' ? 'Unpublished and moved back to drafts.' : 'Saved.'
      );
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof f, label: string, rows: number, hint?: string, check?: string) => (
    <div className="space-y-1.5">
    <label className="block space-y-1">
      <span className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
        {check && <Light level={lv(check)} />}
      </span>
      {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
      {rows === 1 ? (
        <input className={inputCls} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
      ) : (
        <textarea className={inputCls} rows={rows} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
      )}
    </label>
    {check && <FieldChecks result={live} field={check} onConfirm={confirm} onFix={autoFix} fixing={fixing} />}
    </div>
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
        {live && (
          <span
            className={`px-2 py-0.5 rounded-full font-bold ${
              live.level === 'ready'
                ? 'bg-emerald-100 text-emerald-800'
                : live.level === 'check'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {live.level === 'ready'
              ? '● Ready to publish'
              : live.level === 'check'
              ? `● Check ${live.items.filter((i) => i.level === 'check').length} item(s)`
              : '● Don’t publish yet'}
          </span>
        )}
        {story.origin === 'editor' && <span className="px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">Your story</span>}
        <span>{ago(story.created_at)}</span>
        <a href={story.source_url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
          Original: {story.source_name} ↗
        </a>
        {story.review_status === 'approved' && (
          <Link href={articlePath(story)} target="_blank" className="text-blue-600 hover:underline">
            View live ↗
          </Link>
        )}
      </div>

      <div className="flex gap-3">
        {f.original_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.original_image_url} alt="" className="w-24 h-24 sm:w-32 sm:h-24 rounded-xl object-cover object-top shrink-0" />
        ) : (
          <div className="w-24 h-24 sm:w-32 sm:h-24 rounded-xl bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-400 flex items-center justify-center text-center p-2 shrink-0">
            No photo · Voxpolis card will be used
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-black leading-snug">{f.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{f.dek}</p>
          {f.image_credit && <p className="text-[11px] text-gray-400 mt-1">{f.image_credit}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {[
            ['headline', 'Headline'],
            ['dek', 'Summary'],
            ['glance', 'At a glance'],
            ...(flexible
              ? [['lead', 'Opening'] as [string, string], ...secs.map((x, i) => [`sec:${i}`, x.heading ? (x.heading.length > 22 ? x.heading.slice(0, 22) + '…' : x.heading) : `Section ${i + 1}`] as [string, string])]
              : [['content', 'Story'] as [string, string], ['analysis', 'What it means'] as [string, string], ['background', 'Background'] as [string, string]]),
            ['photo', 'Photo'],
            ['seo', 'Google listing'],
            ['sources', 'Sources'],
            ['story', 'Overall'],
          ].map(([id, label]) => (
            <span key={id} className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${DOT[lv(id)]}`} />
              {label}
              <span className="sr-only">: {WORD[lv(id)]}</span>
            </span>
          ))}
        </div>
        {!open && live.level !== 'ready' && (
          <p className="text-xs text-gray-500">Press Edit to see what to fix or check under each part.</p>
        )}
        {fixableItems.length > 0 && (
          <button
            type="button"
            disabled={fixing || verifying}
            onClick={() => autoFix(fixableItems)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-60"
          >
            {fixing ? '✨ Fixing… (about 30 seconds)' : `✨ Fix all ${fixableItems.length} problem${fixableItems.length > 1 ? 's' : ''} for me`}
          </button>
        )}
        {verifying && !fixing && <p className="text-xs text-gray-500">Checking the fixed story against the reports…</p>}
        {fixMsg && (
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 p-3 space-y-2 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">
                {fixMsg.changes.length ? `Done: ${fixMsg.changes.length} change${fixMsg.changes.length > 1 ? 's' : ''} made and saved.` : 'No changes were needed.'}
                {fixMsg.verified ? ` ${fixMsg.verified} item${fixMsg.verified > 1 ? 's were' : ' was'} confirmed correct by the reports.` : ''}
              </p>
              {undoSnap && (
                <button type="button" onClick={undoFix} className="text-xs font-bold text-gray-600 hover:underline shrink-0">
                  Undo
                </button>
              )}
            </div>
            {fixMsg.changes.length > 0 && (
              <details>
                <summary className="cursor-pointer text-violet-700 dark:text-violet-300 font-semibold">See what changed</summary>
                <ul className="mt-2 space-y-2">
                  {fixMsg.changes.map((c, k) => (
                    <li key={k} className="space-y-0.5">
                      {c.before && <p className="text-gray-500 line-through">{c.before}</p>}
                      {c.after ? <p className="text-gray-900 dark:text-gray-100">{c.after}</p> : <p className="text-gray-500 italic">Removed.</p>}
                      <p className="text-xs text-gray-500">{c.reason}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {fixMsg.unresolved.length > 0 && (
              <p className="text-amber-800 dark:text-amber-300">Still needs you: {fixMsg.unresolved.join(' ')}</p>
            )}
          </div>
        )}
        {fidelity?.status === 'done' && (
          <p className="text-xs text-gray-500">
            Accuracy check: {new Date(fidelity.checked_at).toLocaleString()} ·{' '}
            {live.items.some((i) => i.key?.startsWith('fid:')) ? 'sentences to look at are shown under each part' : 'every sentence matches the reports'}
          </p>
        )}
        {fidelity?.status === 'no_sources' && <p className="text-xs text-amber-700">Accuracy check: the original reports could not be read. Check the facts by hand.</p>}
        <FieldChecks result={live} field="story" onConfirm={confirm} onFix={autoFix} fixing={fixing} />
      </div>

      {open && (
        <div className="space-y-3 pt-1">
          {field('title', 'Headline', 1, undefined, 'headline')}
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Web address</span>
            <div className="flex items-center rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden text-sm">
              <span className="px-3 py-2 text-gray-400 bg-gray-50 dark:bg-gray-900 whitespace-nowrap">voxpolis.app/{articlePath({ slug: '', country_code: story.country_code }).split('/')[1]}/</span>
              <input
                className="flex-1 min-w-0 px-2 py-2 bg-transparent focus:outline-none disabled:text-gray-400"
                value={f.slug}
                disabled={story.review_status === 'approved'}
                onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') })}
              />
            </div>
            <span className="block text-[11px] text-gray-400">
              {story.review_status === 'approved' ? 'Locked after publishing.' : '3-6 key words, e.g. peter-obi-tinubu-campaign-2027. Locked once published.'}
            </span>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Country</span>
            <select className={inputCls} value={f.country_code} onChange={(e) => setF({ ...f, country_code: e.target.value })}>
              {ALL_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-gray-400">
              The country whose own politics the story is about. Use World for other countries and international affairs (wars, summits, sanctions).
            </span>
          </label>
          {field('dek', 'Summary line', 2, 'One sentence under the headline.', 'dek')}
          {field('key_points', 'At a glance', 4, '2-4 short points, one per line', 'glance')}
          {flexible ? (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Opening ({words} words in the story) <Light level={lv('lead')} />
                </span>
                <span className="block text-[11px] text-gray-400">No subheading. Leave a blank line between paragraphs.</span>
                <textarea className={inputCls} rows={5} value={lead} onChange={(e) => setLead(e.target.value)} />
              </label>
              <FieldChecks result={live} field="lead" onConfirm={confirm} onFix={autoFix} fixing={fixing} />
              {secs.map((x, i) => (
                <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
                    Section {i + 1} <Light level={lv(`sec:${i}`)} />
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <input
                      className={`${inputCls} flex-1 min-w-[200px] font-bold`}
                      aria-label={`Subheading ${i + 1}`}
                      placeholder="Subheading written for this story"
                      value={x.heading}
                      onChange={(e) => setSec(i, { heading: e.target.value })}
                    />
                    <select
                      aria-label={`Section type ${i + 1}`}
                      className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-2 py-2 text-sm"
                      value={x.kind}
                      onChange={(e) => setSec(i, { kind: e.target.value })}
                    >
                      {Object.entries(KIND_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea className={inputCls} rows={6} aria-label={`Section ${i + 1} text`} value={x.text} onChange={(e) => setSec(i, { text: e.target.value })} />
                  <FieldChecks result={live} field={`sec:${i}`} onConfirm={confirm} onFix={autoFix} fixing={fixing} />
                  <div className="flex gap-3 text-xs font-bold">
                    <button type="button" onClick={() => moveSec(i, -1)} disabled={i === 0} className="text-gray-600 disabled:opacity-30">↑ Move up</button>
                    <button type="button" onClick={() => moveSec(i, 1)} disabled={i === secs.length - 1} className="text-gray-600 disabled:opacity-30">↓ Move down</button>
                    <button type="button" onClick={() => setSecs((all) => all.filter((_, j) => j !== i))} className="text-red-600">Remove section</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setSecs((all) => [...all, { heading: '', kind: 'report', text: '' }])} className="text-sm font-bold text-blue-600">
                + Add a section
              </button>
              <label className="block space-y-1">
                <span className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  What to watch (optional) <Light level={lv('watch')} />
                </span>
                <input className={inputCls} value={watch} onChange={(e) => setWatch(e.target.value)} />
              </label>
              <FieldChecks result={live} field="watch" onConfirm={confirm} onFix={autoFix} fixing={fixing} />
              {story.sources && story.sources.length > 0 && (
                <p className="text-xs text-gray-500">
                  Built from {story.sources.length} report{story.sources.length > 1 ? 's' : ''}:{' '}
                  {story.sources.map((x, i) => (
                    <a key={x.url} href={x.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                      {x.name}
                      {i < story.sources!.length - 1 ? ', ' : ''}
                    </a>
                  ))}
                </p>
              )}
            </div>
          ) : (
            <>
              {field('content', `Story (${words} words)`, 14, undefined, 'content')}
              {field('analysis', 'What it means', 7, undefined, 'analysis')}
              {field('background', 'Background', 4, undefined, 'background')}
              {field('what_next', 'What happens next', 3, undefined, 'watch')}
            </>
          )}
          <div className="space-y-1.5 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
            <span className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              Sources <Light level={lv('sources')} />
            </span>
            <span className="block text-[11px] text-gray-400">
              One per line: <code>Name | link</code>, e.g. <code>INEC statement | https://inecnigeria.org/…</code>. Every story needs at least one: a report, an official statement or a document.
            </span>
            <textarea className={inputCls} rows={3} value={srcText} onChange={(e) => setSrcText(e.target.value)} />
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {srcList().map((x) => (
                <a key={x.url} href={x.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                  Open {x.name || 'link'} ↗
                </a>
              ))}
            </div>
            <FieldChecks result={live} field="sources" onConfirm={confirm} onFix={autoFix} fixing={fixing} />
          </div>
          {field('poll_question', 'Reader question (leave empty for none)', 1, 'Only for a real public choice. Neutral, agree/disagree.')}
          <div className="space-y-2 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
            <span className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              Featured image <Light level={lv('photo')} />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="px-3 py-2 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-bold cursor-pointer">
                {uploading ? 'Uploading…' : f.original_image_url ? 'Replace photo' : 'Upload photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                />
              </label>
              {f.original_image_url && (
                <button type="button" onClick={() => setF({ ...f, original_image_url: '', image_credit: '' })} className="text-xs font-bold text-red-600 hover:underline">
                  Remove photo
                </button>
              )}
            </div>
            <input
              className={inputCls}
              placeholder="Photo credit, e.g. Photo: Voxpolis  (leave empty if it's your own photo)"
              value={f.image_credit}
              onChange={(e) => setF({ ...f, image_credit: e.target.value })}
            />
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-2.5 space-y-2">
              {!ph.open ? (
                <button type="button" onClick={() => findPhotos()} className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  🔍 Find a free photo
                </button>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      className={inputCls}
                      placeholder='Search anything: a name, place or topic (e.g. "Ali Khamenei", "Tehran", "Iran flag")'
                      value={ph.query}
                      onChange={(e) => setPh((x) => ({ ...x, query: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), findPhotos(ph.query))}
                    />
                    <button type="button" disabled={ph.busy} onClick={() => findPhotos(ph.query)} className="px-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-bold disabled:opacity-50">
                      {ph.busy ? 'Searching…' : 'Search'}
                    </button>
                  </div>
                  {ph.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-gray-500 self-center">From this story:</span>
                      {ph.suggestions.map((sg) => (
                        <button
                          key={sg}
                          type="button"
                          onClick={() => (setPh((x) => ({ ...x, query: sg })), findPhotos(sg))}
                          className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold hover:bg-blue-100"
                        >
                          {sg}
                        </button>
                      ))}
                    </div>
                  )}
                  {ph.note && <p className="text-xs text-gray-500">{ph.note}</p>}
                  {ph.results.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ph.results.map((p) => (
                        <figure key={p.url} className={`rounded-lg border overflow-hidden ${f.original_image_url === p.url ? 'border-emerald-500 ring-2 ring-emerald-400' : 'border-gray-200 dark:border-gray-800'}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt={p.subject} className="w-full h-28 object-cover object-top" loading="lazy" />
                          <figcaption className="p-1.5 space-y-1">
                            <p className="text-[10px] text-gray-500 line-clamp-2">{p.credit}</p>
                            <div className="flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => setF((x) => ({ ...x, original_image_url: p.url, image_credit: p.credit, image_license: p.license, image_page_url: p.pageUrl }))}
                                className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold"
                              >
                                {f.original_image_url === p.url ? '✓ Chosen' : 'Use this photo'}
                              </button>
                              <a href={p.pageUrl} target="_blank" rel="noopener" className="text-[10px] text-blue-600 hover:underline">
                                Details ↗
                              </a>
                            </div>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500">
                    These are free to use with the credit shown (added automatically). After choosing, press <strong>Save edits</strong>.
                  </p>
                </>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              Only use photos you own or have permission to use: your own photos, official government handouts that allow reuse,
              licensed stock, or Wikimedia Commons. Never photos copied from other news sites.
            </p>
            <FieldChecks result={live} field="photo" onConfirm={confirm} onFix={autoFix} fixing={fixing} />
          </div>

          <div className="space-y-2 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
            <span className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              How it looks on Google <Light level={lv('seo')} />
            </span>
            <div className="rounded-lg bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 p-3 font-sans">
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                voxpolis.app › {articlePath({ slug: f.slug, country_code: story.country_code }).split('/').filter(Boolean).join(' › ')}
              </p>
              <p className="text-[17px] leading-snug text-[#1a0dab] dark:text-blue-400">
                {f.title.length > 65 ? f.title.slice(0, 62).trimEnd() + '…' : f.title} | Voxpolis
              </p>
              <p className="text-[13px] text-gray-700 dark:text-gray-300 line-clamp-2">
                {(() => {
                  const d = (f.meta_description || f.dek).trim();
                  return d.length > 160 ? d.slice(0, 157).trimEnd() + '…' : d || 'No description yet.';
                })()}
              </p>
            </div>
            <label className="block space-y-1">
              <span className="block text-[11px] text-gray-500">
                Google description ({(f.meta_description || f.dek).trim().length}/160). Leave empty to use the summary line.
              </span>
              <textarea
                className={inputCls}
                rows={2}
                placeholder={f.dek}
                value={f.meta_description}
                onChange={(e) => setF({ ...f, meta_description: e.target.value })}
              />
            </label>
            <FieldChecks result={live} field="seo" onConfirm={confirm} onFix={autoFix} fixing={fixing} />
            <p className="text-[11px] text-gray-500">
              Added automatically to every published story: page title and description tags, Google News article data, the news sitemap,
              the share image for social media, the main web address (canonical) and breadcrumbs.
            </p>
          </div>
        </div>
      )}

      {preview && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 space-y-4 text-[15px] leading-relaxed">
          <p className="text-xs text-gray-500">Preview · Voxpolis Politics Desk</p>
          <h3 className="text-xl sm:text-2xl font-black leading-tight">{f.title}</h3>
          {f.dek && <p className="text-gray-600 dark:text-gray-300">{f.dek}</p>}
          {f.original_image_url && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.original_image_url} alt="" className="w-full max-h-72 object-cover object-top rounded-xl" />
              {f.image_credit && <figcaption className="text-[11px] text-gray-500 mt-1">{f.image_credit}</figcaption>}
            </figure>
          )}
          {f.key_points.trim() && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4">
              <ul className="list-disc pl-5 space-y-1">
                {f.key_points.split('\n').filter((k) => k.trim()).map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          )}
          {flexible ? (
            <>
              {lead.split(/\n\s*\n/).filter((p) => p.trim()).map((p, i) => (
                <p key={`l${i}`}>{p}</p>
              ))}
              {secs.map((x, i) => (
                <div key={`s${i}`} className="space-y-3">
                  {x.kind === 'analysis' && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-white bg-gray-900 px-2 py-0.5 rounded">Analysis</span>
                  )}
                  <h4 className="text-lg font-black">{x.heading}</h4>
                  {x.text.split(/\n\s*\n/).filter((p) => p.trim()).map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              ))}
              {watch.trim() && (
                <p>
                  <strong>What to watch: </strong>
                  {watch}
                </p>
              )}
            </>
          ) : (
            f.content.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)
          )}
          {!flexible && f.analysis.trim() && (
            <>
              <h4 className="text-lg font-black">What it means</h4>
              {f.analysis.split(/\n\s*\n/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </>
          )}
          {!flexible && f.background.trim() && (
            <>
              <h4 className="text-lg font-black">Background</h4>
              <p>{f.background}</p>
            </>
          )}
          {!flexible && f.what_next.trim() && (
            <>
              <h4 className="text-lg font-black">What happens next</h4>
              <p>{f.what_next}</p>
            </>
          )}
          {f.poll_question.trim() && <p className="font-bold">Reader question: {f.poll_question}</p>}
          <p className="text-xs text-gray-500">Reporting from: {(story.sources?.length ? story.sources.map((x) => x.name) : [story.source_name]).join(', ')}.</p>
        </div>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        {story.review_status !== 'approved' && (
          <button
            type="button"
            disabled={busy || live.level === 'stop'}
            title={live.level === 'stop' ? 'Fix the red items first' : undefined}
            onClick={() => act('approve')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50"
          >
            ✓ Publish
          </button>
        )}
        <button type="button" onClick={() => setOpen(!open)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold">
          {open ? 'Close editor' : '✎ Edit'}
        </button>
        <button type="button" onClick={() => setPreview(!preview)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold">
          {preview ? 'Hide preview' : '👁 Preview'}
        </button>
        <button
          type="button"
          disabled={verifying || busy}
          onClick={runVerify}
          title="An AI fact-checker compares every sentence with the original reports (10-30 seconds)"
          className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold disabled:opacity-50"
        >
          {verifying ? 'Checking accuracy…' : fidelity?.status === 'done' ? '↻ Check accuracy again' : '🔎 Check accuracy'}
        </button>
        {open && (
          <button type="button" disabled={busy} onClick={() => act('save')} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50">
            Save edits
          </button>
        )}
        {story.review_status === 'pending' && (
          <button type="button" disabled={busy} onClick={() => act('reject')} className="px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-red-300 text-red-600 text-sm font-bold disabled:opacity-50">
            ✕ Discard
          </button>
        )}
        {story.review_status !== 'pending' && (
          <button type="button" disabled={busy} onClick={() => act('reopen')} className="px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 text-sm font-bold disabled:opacity-50">
            {story.review_status === 'approved' ? 'Unpublish' : 'Move back to drafts'}
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
  const [newId, setNewId] = useState('');
  const [nw, setNw] = useState({ open: false, title: '', country: 'NG', category: 'politics', busy: false, err: '' });

  const createStory = async () => {
    setNw((x) => ({ ...x, busy: true, err: '' }));
    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'create', title: nw.title, country_code: nw.country, category: nw.category }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not create the draft');
      setNewId(d.id);
      setNw({ open: false, title: '', country: nw.country, category: 'politics', busy: false, err: '' });
      if (status !== 'pending') setStatus('pending');
      else load();
    } catch (e: any) {
      setNw((x) => ({ ...x, busy: false, err: e.message }));
    }
  };

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
            <h1 className="text-2xl font-black">Newsroom drafts</h1>
            <Link href="/admin" className="text-sm text-blue-600 hover:underline">
              Admin home
            </Link>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            New stories arrive here as private drafts. Nothing appears on Voxpolis until you press Publish.
          </p>
        </header>

        <details className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm">
          <summary className="font-bold cursor-pointer">Before you publish: the 6 checks (about 3 minutes)</summary>
          <ol className="mt-3 space-y-2 list-decimal pl-5 leading-relaxed text-gray-700 dark:text-gray-300">
            <li><strong>Go through the coloured dots.</strong> Red = must fix (Publish stays locked). Amber = check it: open &quot;How do I check?&quot;, and if it&apos;s right press &quot;It&apos;s correct&quot; so it turns green.</li>
            <li><strong>Facts:</strong> open the original report. Check every name, title, number and date in the story against it.</li>
            <li><strong>Fair to all sides:</strong> if there is a dispute, is the other side&apos;s position included? Are claims attributed (&quot;X said&quot;), not stated as fact?</li>
            <li><strong>No opinion in the news:</strong> opinions only in the Analysis section. No praise or attacks on anyone, no &quot;popular&quot;, &quot;disastrous&quot;, &quot;far-right&quot; and similar.</li>
            <li><strong>Your touch:</strong> sharpen the headline and, where you can, add one sourced fact or piece of context you know.</li>
            <li><strong>Photo:</strong> right person or place? Only photos you own or that are licensed (Wikimedia, government handouts that allow reuse).</li>
          </ol>
          <p className="mt-3 text-xs text-gray-500">The checker catches common problems automatically, but it can&apos;t know everything. If you are unsure about a story, don&apos;t publish it.</p>
        </details>

        <section className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20 p-4 text-sm space-y-3">
          {!nw.open ? (
            <button type="button" onClick={() => setNw((x) => ({ ...x, open: true }))} className="font-bold text-blue-700 dark:text-blue-300">
              + Write your own story
            </button>
          ) : (
            <>
              <p className="font-bold">Write your own story</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                It opens in the same editor with the same checks. Add your sources (a report, an official statement or a document) and press
                &quot;Check accuracy&quot; before publishing. Your own drafts never expire.
              </p>
              <input
                className={inputCls}
                placeholder="Working headline: who did what"
                value={nw.title}
                onChange={(e) => setNw((x) => ({ ...x, title: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                <select className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm" value={nw.country} onChange={(e) => setNw((x) => ({ ...x, country: e.target.value }))}>
                  {ALL_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm" value={nw.category} onChange={(e) => setNw((x) => ({ ...x, category: e.target.value }))}>
                  <option value="politics">News story</option>
                  <option value="opinion">Opinion / column</option>
                </select>
                <button type="button" disabled={nw.busy} onClick={createStory} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50">
                  {nw.busy ? 'Creating…' : 'Create draft'}
                </button>
                <button type="button" onClick={() => setNw((x) => ({ ...x, open: false, err: '' }))} className="px-3 py-2 text-gray-600 font-bold">
                  Cancel
                </button>
              </div>
              {nw.err && <p className="text-red-600 text-xs">{nw.err}</p>}
            </>
          )}
        </section>

        <nav className="flex gap-2">
          {(['pending', 'approved', 'rejected'] as Status[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize ${status === s ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'}`}
            >
              {s === 'pending' ? 'Drafts' : s === 'approved' ? 'Published' : 'Discarded'} {counts[s] != null && <span className="opacity-60">({counts[s]})</span>}
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
          <p className="text-sm text-gray-500 py-10 text-center">{status === 'pending' ? 'No drafts waiting. New ones arrive every hour.' : 'No stories here yet.'}</p>
        )}

        <div className="space-y-4">
          {[...stories]
            .sort((a, b) => Number(b.id === newId) - Number(a.id === newId) || Number(b.origin === 'editor') - Number(a.origin === 'editor'))
            .map((s) => (
            <StoryEditor
              key={`${s.id}-${s.review_status}`}
              autoOpen={s.id === newId}
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
