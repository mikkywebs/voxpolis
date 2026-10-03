'use client';

import { useState, useEffect } from 'react';
import { Vote, CheckCircle2, MessageSquare } from 'lucide-react';

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
 * Intelligently deduplicate, rewrite, and humanize poll questions into natural civic questions.
 * Avoids dumping raw article titles or robotic "Do you agree with the stance regarding..." templates.
 */
function humanizeQuestion(raw: string, title?: string, snippet?: string): {
  isPolicyDebate: boolean;
  questionText: string;
  discussionPrompt: string;
} {
  const cleanTitle = (title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();
  const cleanRaw = (raw || '').replace(/^Do you agree with the (stance|position) regarding\s*["“]?/i, '').replace(/["”]?\??$/i, '').trim();
  const context = `${cleanTitle} ${cleanRaw} ${snippet || ''}`.toLowerCase();

  // 1. Stories that are non-controversial events, ceremonies, legal procedural steps, or tragedies
  const isNonDebate =
    context.includes('premiere') ||
    context.includes('documentary') ||
    context.includes('memorial') ||
    context.includes('anniversary') ||
    context.includes('condolence') ||
    context.includes('mourn') ||
    context.includes('adjourn') ||
    context.includes('rejects application to remove') ||
    context.includes('justice khobo') ||
    context.includes('recusal') ||
    context.includes('arrest') ||
    context.includes('plane crash') ||
    context.includes('boat mishap') ||
    context.includes('kidnap') ||
    context.includes('abduction');

  if (isNonDebate) {
    let prompt = 'What is your perspective on this political development?';
    if (context.includes('el-rufai') || context.includes('khobo')) {
      prompt = 'What is your perspective on the court\'s proceedings regarding former Governor El-Rufai?';
    } else if (context.includes('mko') || context.includes('documentary') || context.includes('abiola')) {
      prompt = 'What are your thoughts on preserving the democratic legacy of June 12 and MKO Abiola?';
    } else if (cleanTitle) {
      prompt = `What are your thoughts on the latest developments regarding "${cleanTitle.slice(0, 80)}"?`;
    }

    return {
      isPolicyDebate: false,
      questionText: prompt,
      discussionPrompt: prompt,
    };
  }

  // 2. Specific Policy Topics rewritten with natural human wording
  let humanQ = '';

  // Atiku on Fuel Subsidy / Presidency
  if (context.includes('atiku') && (context.includes('subsidy') || context.includes('fuel') || context.includes('president'))) {
    humanQ = 'Do you agree Atiku will do better if elected as president come 2027?';
  }
  // Tinubu on Economic Reforms / Hardship / Subsidies
  else if (context.includes('tinubu') && (context.includes('subsidy') || context.includes('reform') || context.includes('hardship') || context.includes('economy'))) {
    humanQ = 'Do you believe the administration\'s current economic reform policies are leading Nigeria in the right direction?';
  }
  // Peter Obi on Governance / Leadership
  else if (context.includes('peter obi') || context.includes('obi:') || (context.includes('obi') && context.includes('leadership'))) {
    humanQ = 'Do you agree with Peter Obi that Nigeria\'s primary challenge is leadership failure rather than resource scarcity?';
  }
  // Minimum Wage & Salaries
  else if (context.includes('minimum wage') || context.includes('wage') || context.includes('labour') || context.includes('salary')) {
    humanQ = 'Should federal and state governments accelerate the full, mandatory implementation of the new minimum wage?';
  }
  // State Police & Internal Security
  else if (context.includes('state police') || context.includes('policing')) {
    humanQ = 'Should individual states be granted constitutional authority to establish and fund their own state police forces?';
  }
  // Local Government Financial Autonomy
  else if (context.includes('local government') && (context.includes('autonomy') || context.includes('allocation'))) {
    humanQ = 'Do you support direct federation revenue disbursement to local governments without state government control?';
  }
  // Electoral Reforms & INEC
  else if (context.includes('inec') || context.includes('electoral act') || context.includes('electronic transmission')) {
    humanQ = 'Do you agree that electronic transmission of election results from polling units should be made strictly mandatory?';
  }
  // Electricity Tariff & Power
  else if (context.includes('electricity') || context.includes('tariff') || context.includes('band a')) {
    humanQ = 'Do you agree with the current electricity tariff pricing structure for commercial and residential consumers?';
  }
  // Tax Reforms & VAT
  else if (context.includes('tax') || context.includes('vat') || context.includes('revenue')) {
    humanQ = 'Do you support the implementation of new tax reforms under current economic conditions?';
  }
  // Crude Oil Theft & Energy Resources
  else if (context.includes('oil theft') || context.includes('pipeline') || (context.includes('crude') && context.includes('theft'))) {
    humanQ = 'Do you believe security operations and surveillance contracts have significantly reduced crude oil theft?';
  }
  // General speaker-based statement (e.g. "Gov X calls for Y")
  else if (cleanTitle.includes(':') || cleanTitle.includes('—') || cleanTitle.includes('-')) {
    const parts = cleanTitle.split(/[:—–-]/);
    const speaker = parts[0]?.trim();
    if (speaker && speaker.length > 2 && speaker.length < 35) {
      humanQ = `Do you agree with the policy stance expressed by ${speaker} on this issue?`;
    }
  }

  // Fallback if no specific template matched
  if (!humanQ) {
    if (raw && !raw.toLowerCase().includes('do you agree with the stance regarding') && raw.endsWith('?')) {
      humanQ = raw;
    } else {
      humanQ = 'Do you support the proposed policy measures and governance approach reported in this briefing?';
    }
  }

  return {
    isPolicyDebate: true,
    questionText: humanQ,
    discussionPrompt: humanQ,
  };
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

  const rawQuestion = poll?.question || '';
  const { isPolicyDebate, questionText, discussionPrompt } = humanizeQuestion(rawQuestion, articleTitle, articleSnippet);

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

  // If the news story is not a binary policy dispute, render the clean Community Perspective card
  if (!isPolicyDebate) {
    return (
      <div className="my-6 p-6 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Community Perspective
          </span>
        </div>

        <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-relaxed">
          {discussionPrompt}
        </h4>

        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          This report covers ongoing events and civic developments. We welcome independent citizen viewpoints, analysis, and civil discussion in the public forum below.
        </p>

        <button
          type="button"
          onClick={scrollToComments}
          className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Share Your Thoughts in the Comments ↓</span>
        </button>
      </div>
    );
  }

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
        {questionText}
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
