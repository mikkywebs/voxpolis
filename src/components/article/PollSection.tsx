'use client';

import { useState } from 'react';
import { Vote, CheckCircle2 } from 'lucide-react';

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

  const question = poll?.question || 'Do you support the policy developments reported in this executive summary?';

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

  return (
    <div className="my-6 p-6 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-md">
      <div className="flex items-center gap-2 mb-3">
        <Vote className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Public Opinion Poll (Members Only)
        </span>
      </div>

      <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-4">{question}</h4>

      {/* Progress Bar */}
      <div className="mb-4">
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
          className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
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
          className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
            userVote === 'disagree'
              ? 'bg-rose-600 text-white border-rose-600 shadow'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
          }`}
        >
          {userVote === 'disagree' && <CheckCircle2 className="w-4 h-4" />}
          Vote Disagree
        </button>
      </div>
    </div>
  );
}
