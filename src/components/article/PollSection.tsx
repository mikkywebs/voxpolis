'use client';

import { useState, useEffect } from 'react';
import { Vote, CheckCircle2, MessageSquare } from 'lucide-react';

import { generateCivicPollQuestion } from '@/lib/news';

interface PollSectionProps {
  poll?: {
    id: string;
    question: string;
    agree_count: number;
    disagree_count: number;
  };
  articleSlug?: string;
  articleId?: string;
  articleTitle?: string;
  articleSnippet?: string;
  onRequireAuth?: () => void;
  isLoggedIn?: boolean;
}

/**
 * Validates and resolves an authentic civic poll question.
 * Returns null if the news does not contain a genuine policy controversy or debate.
 * NEVER forces a robotic template or parses numbers/years (e.g. '2027') as speakers.
 */
function getValidatedPollQuestion(rawQuestion?: string, title?: string, snippet?: string): string | null {
  if (rawQuestion && rawQuestion.trim()) {
    const q = rawQuestion.trim();
    const isCorrupted =
      /expressed by \d+/i.test(q) ||
      /expressed by (breaking|just in|report|watch|video|photos?|update|exclusive|opinion|editorial|alert|special|live|court|ndc|apc|pdp|lp|nnpp|inec|fbi|dss|efcc)/i.test(q) ||
      /expressed by (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(q) ||
      /^do you agree with the (stance|position) regarding/i.test(q) ||
      /^do you support the proposed policy measures and governance approach/i.test(q) ||
      /^do you support the policy direction and governance approach proposed in this report/i.test(q);

    if (!isCorrupted && q.endsWith('?') && q.length > 10) {
      return q;
    }
  }

  // Not all news has a debate — return null if no genuine civic question was provided by the publisher
  return null;
}

export default function PollSection({
  poll,
  articleSlug,
  articleId,
  articleTitle,
  articleSnippet,
  onRequireAuth,
  isLoggedIn = false,
}: PollSectionProps) {
  const pollKey = articleSlug || articleId || poll?.id || 'voxpolis_poll';
  const initialAgree = poll?.agree_count || 0;
  const initialDisagree = poll?.disagree_count || 0;

  const [agree, setAgree] = useState(initialAgree);
  const [disagree, setDisagree] = useState(initialDisagree);
  const [userVote, setUserVote] = useState<'agree' | 'disagree' | null>(null);

  // Restore saved poll vote and counts from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedVote = localStorage.getItem(`voxpolis_poll_vote_${pollKey}`);
      if (savedVote === 'agree' || savedVote === 'disagree') {
        setUserVote(savedVote);
      }

      const savedCountsStr = localStorage.getItem(`voxpolis_poll_counts_${pollKey}`);
      if (savedCountsStr) {
        const parsed = JSON.parse(savedCountsStr);
        if (typeof parsed.agree === 'number' && typeof parsed.disagree === 'number') {
          setAgree(parsed.agree);
          setDisagree(parsed.disagree);
        }
      }
    } catch {}
  }, [pollKey]);

  const validQuestion = getValidatedPollQuestion(poll?.question, articleTitle, articleSnippet);

  // If there is nothing to debate in this news report, do not render a poll section at all
  if (!validQuestion) {
    return null;
  }

  const total = agree + disagree;
  const agreePercent = total > 0 ? Math.round((agree / total) * 100) : 0;
  const disagreePercent = total > 0 ? 100 - agreePercent : 0;

  const handleVote = (type: 'agree' | 'disagree') => {
    if (!isLoggedIn && onRequireAuth) {
      onRequireAuth();
      return;
    }

    if (userVote === type) return;

    let newAgree = agree;
    let newDisagree = disagree;

    if (type === 'agree') {
      newAgree = agree + 1;
      if (userVote === 'disagree') newDisagree = Math.max(0, disagree - 1);
    } else {
      newDisagree = disagree + 1;
      if (userVote === 'agree') newAgree = Math.max(0, agree - 1);
    }

    setAgree(newAgree);
    setDisagree(newDisagree);
    setUserVote(type);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`voxpolis_poll_vote_${pollKey}`, type);
        localStorage.setItem(
          `voxpolis_poll_counts_${pollKey}`,
          JSON.stringify({ agree: newAgree, disagree: newDisagree })
        );
      } catch {}
    }

    // Background sync to API if available
    try {
      fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: poll?.id || pollKey,
          articleSlug,
          articleId,
          vote: type,
        }),
      }).catch(() => {});
    } catch {}
  };

  const scrollToComments = () => {
    const commentEl = document.getElementById('comments-section') || document.querySelector('form');
    if (commentEl) {
      commentEl.scrollIntoView({ behavior: 'smooth' });
      const textarea = commentEl.querySelector('textarea');
      if (textarea) textarea.focus();
    }
  };



  // Binary Policy Poll (for genuine policy disputes and reform proposals)
  return (
    <div className="my-6 p-6 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-md space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Vote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Public Opinion Poll
          </span>
        </div>
      </div>

      <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-relaxed">
        {validQuestion}
      </h4>

      {/* Progress Bar */}
      <div>
        {total === 0 ? (
          <div>
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" />
            <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
              No member votes cast yet. Be the first verified member to vote!
            </div>
          </div>
        ) : (
          <div>
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
              <div style={{ width: `${agreePercent}%` }} className="bg-emerald-500 transition-all duration-500" />
              <div style={{ width: `${disagreePercent}%` }} className="bg-rose-500 transition-all duration-500" />
            </div>
            <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-gray-300 mt-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">Agree: {agreePercent}% ({agree})</span>
              <span className="text-rose-600 dark:text-rose-400">Disagree: {disagreePercent}% ({disagree})</span>
            </div>
          </div>
        )}
      </div>

      {/* Vote Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleVote('agree')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
            userVote === 'agree'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow'
              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
          }`}
        >
          {userVote === 'agree' && <CheckCircle2 className="w-4 h-4" />}
          Vote Agree
        </button>

        <button
          onClick={() => handleVote('disagree')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
            userVote === 'disagree'
              ? 'bg-rose-600 text-white border-rose-600 shadow'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
          }`}
        >
          {userVote === 'disagree' && <CheckCircle2 className="w-4 h-4" />}
          Vote Disagree
        </button>
      </div>

      {/* Discussion Prompt for Detailed Thoughts */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="text-gray-500 dark:text-gray-400 font-medium">
          Have a nuanced or detailed perspective?
        </span>
        <button
          type="button"
          onClick={scrollToComments}
          className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Share thoughts in comments →</span>
        </button>
      </div>
    </div>
  );
}
