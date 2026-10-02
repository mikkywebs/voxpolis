'use client';

import { useState } from 'react';
import { Vote, CheckCircle2, MessageSquare } from 'lucide-react';

interface PollSectionProps {
  poll?: {
    id: string;
    question: string;
    agree_count: number;
    disagree_count: number;
  };
  onRequireAuth?: () => void;
  isLoggedIn?: boolean;
}

export default function PollSection({ poll, onRequireAuth, isLoggedIn = false }: PollSectionProps) {
  const initialAgree = poll?.agree_count || 0;
  const initialDisagree = poll?.disagree_count || 0;

  const [agree, setAgree] = useState(initialAgree);
  const [disagree, setDisagree] = useState(initialDisagree);
  const [userVote, setUserVote] = useState<'agree' | 'disagree' | null>(null);

  const rawQuestion = poll?.question || 'Do you support the policy developments reported in this executive summary?';

  // Normalize open-ended questions into binary agreement questions if needed
  let displayQuestion = rawQuestion;
  if (rawQuestion.toLowerCase().startsWith('what is your perspective on')) {
    const topic = rawQuestion.replace(/what is your perspective on\s*/i, '').replace(/\?$/, '');
    displayQuestion = `Do you agree with the position regarding ${topic}?`;
  } else if (rawQuestion.toLowerCase().startsWith('what ') || rawQuestion.toLowerCase().startsWith('how ') || rawQuestion.toLowerCase().startsWith('why ')) {
    const topic = rawQuestion.replace(/^(what|how|why)\s+(is|are|do|does|did|would)\s*/i, '').replace(/\?$/, '');
    displayQuestion = `Do you agree with the reported stance on ${topic}?`;
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

    if (type === 'agree') {
      setAgree(agree + 1);
      if (userVote === 'disagree') setDisagree(Math.max(0, disagree - 1));
    } else {
      setDisagree(disagree + 1);
      if (userVote === 'agree') setAgree(Math.max(0, agree - 1));
    }
    setUserVote(type);
  };

  const scrollToComments = () => {
    const commentEl = document.getElementById('comments-section') || document.querySelector('form');
    if (commentEl) {
      commentEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="my-6 p-6 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-md space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Vote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Public Opinion Poll
          </span>
        </div>
        <span className="text-[11px] font-semibold text-gray-400">Binary Policy Stance</span>
      </div>

      <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-relaxed">
        {displayQuestion}
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
