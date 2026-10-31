'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle2, Vote } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface ReaderPollData {
  id: string;
  question: string;
  agree_count: number;
  disagree_count: number;
  article_title?: string;
  article_path?: string;
}

/** Below this many votes the split isn't shown: a 2-vote "67%" means nothing. */
const MIN_FOR_RESULTS = 10;

async function authHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await createClient().auth.getSession();
    const t = data?.session?.access_token;
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

/**
 * Reader poll: real votes from signed-in members, one vote each (they can change it).
 * Results are shown after you vote, and only once enough members have voted.
 */
export default function ReaderPoll({ poll, variant = 'article', label }: { poll: ReaderPollData; variant?: 'article' | 'rail'; label?: string }) {
  const pathname = usePathname() || '/';
  const [agree, setAgree] = useState(poll.agree_count || 0);
  const [disagree, setDisagree] = useState(poll.disagree_count || 0);
  const [myVote, setMyVote] = useState<'agree' | 'disagree' | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/polls/vote?pollId=${poll.id}`, { headers: await authHeader(), cache: 'no-store' });
        if (!res.ok) return;
        const d = await res.json();
        if (!alive) return;
        setAgree(d.agree);
        setDisagree(d.disagree);
        setMyVote(d.myVote);
        setSignedIn(!!d.signedIn);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [poll.id]);

  const vote = async (v: 'agree' | 'disagree') => {
    if (busy || v === myVote) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ pollId: poll.id, vote: v }),
      });
      const d = await res.json();
      if (res.status === 401) {
        setSignedIn(false);
        return;
      }
      if (!res.ok) throw new Error(d.error || 'Could not save your vote');
      setAgree(d.agree);
      setDisagree(d.disagree);
      setMyVote(d.myVote);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const total = agree + disagree;
  const agreePct = total ? Math.round((agree / total) * 100) : 0;
  const showResults = !!myVote && total >= MIN_FOR_RESULTS;
  const small = variant === 'rail';

  return (
    <section className={`rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 ${small ? 'p-4' : 'p-5 sm:p-6 my-6'} space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
          <Vote className="w-3.5 h-3.5" />
          {label || 'Reader poll'}
        </span>
        {total >= MIN_FOR_RESULTS && <span className="text-[11px] text-gray-500 tabular-nums">{total.toLocaleString()} votes</span>}
      </div>

      <h3 className={`${small ? 'text-sm' : 'text-base'} font-bold leading-snug text-gray-900 dark:text-white`}>{poll.question}</h3>
      {small && poll.article_path && (
        <Link href={poll.article_path} className="block text-xs text-gray-500 hover:text-blue-600 line-clamp-2">
          From: {poll.article_title}
        </Link>
      )}

      {showResults && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-blue-700 dark:text-blue-300">{agreePct}% agree</span>
            <span className="text-rose-700 dark:text-rose-300">{100 - agreePct}% disagree</span>
          </div>
          <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden flex" aria-hidden="true">
            <div style={{ width: `${agreePct}%` }} className="h-full bg-blue-600" />
            <div style={{ width: `${100 - agreePct}%` }} className="h-full bg-rose-600" />
          </div>
        </div>
      )}

      {signedIn === false ? (
        <Link
          href={`/login?redirect=${encodeURIComponent(pathname)}`}
          className="block w-full text-center py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
        >
          Sign in to vote
        </Link>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {(['agree', 'disagree'] as const).map((v) => (
            <button
              key={v}
              type="button"
              disabled={busy}
              onClick={() => vote(v)}
              aria-pressed={myVote === v}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-60 ${
                myVote === v
                  ? v === 'agree'
                    ? 'bg-blue-600 text-white'
                    : 'bg-rose-600 text-white'
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-neutral-700'
              }`}
            >
              {v === 'agree' ? 'Agree' : 'Disagree'}
              {myVote === v && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}
      <p className="text-[11px] text-gray-500 leading-snug">
        {myVote && total < MIN_FOR_RESULTS
          ? `Thanks, your vote is counted. Results appear once ${MIN_FOR_RESULTS} members have voted.`
          : myVote
          ? 'Your vote is counted. You can change it.'
          : 'Members only, one vote each. Results show after you vote.'}{' '}
        Not a scientific survey.
      </p>
    </section>
  );
}
