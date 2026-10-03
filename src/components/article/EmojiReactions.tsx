'use client';

import { useState, useEffect } from 'react';

interface EmojiReactionsProps {
  articleId: string;
  onRequireAuth?: () => void;
  isLoggedIn?: boolean;
}

export type ReactionType = 'upvote' | 'funny' | 'love' | 'surprised' | 'angry' | 'sad';

export default function EmojiReactions({ articleId, onRequireAuth, isLoggedIn = true }: EmojiReactionsProps) {
  // Reaction counts stored locally per article ID (with initial values)
  const [counts, setCounts] = useState<{ [key in ReactionType]: number }>({
    upvote: 0,
    funny: 0,
    love: 0,
    surprised: 0,
    angry: 0,
    sad: 0,
  });

  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);

  // Restore counts and active reaction from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedCounts = localStorage.getItem(`voxpolis_reactions_${articleId}`);
      if (savedCounts) {
        const parsed = JSON.parse(savedCounts);
        setCounts((prev) => ({
          ...prev,
          ...parsed,
        }));
      }

      const savedUserReaction = localStorage.getItem(`voxpolis_my_reaction_${articleId}`) as ReactionType | null;
      if (savedUserReaction) {
        setUserReaction(savedUserReaction);
      }
    } catch (e) {
      console.warn('Failed to load reactions from local storage', e);
    }
  }, [articleId]);

  const handleReact = (type: ReactionType) => {
    let nextCounts = { ...counts };
    let nextReaction: ReactionType | null = type;

    if (userReaction === type) {
      // Toggle off
      nextReaction = null;
      nextCounts[type] = Math.max(0, (nextCounts[type] || 0) - 1);
    } else {
      // Decrement previous if any
      if (userReaction && nextCounts[userReaction]) {
        nextCounts[userReaction] = Math.max(0, nextCounts[userReaction] - 1);
      }
      nextCounts[type] = (nextCounts[type] || 0) + 1;
    }

    setUserReaction(nextReaction);
    setCounts(nextCounts);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`voxpolis_reactions_${articleId}`, JSON.stringify(nextCounts));
        if (nextReaction) {
          localStorage.setItem(`voxpolis_my_reaction_${articleId}`, nextReaction);
        } else {
          localStorage.removeItem(`voxpolis_my_reaction_${articleId}`);
        }
      } catch (e) {
        console.warn('Failed to save reaction', e);
      }
    }
  };

  const reactions: { type: ReactionType; emoji: string; label: string }[] = [
    { type: 'upvote', emoji: '👍', label: 'Upvote' },
    { type: 'funny', emoji: '😝', label: 'Funny' },
    { type: 'love', emoji: '😍', label: 'Love' },
    { type: 'surprised', emoji: '😮', label: 'Surprised' },
    { type: 'angry', emoji: '😤', label: 'Angry' },
    { type: 'sad', emoji: '😢', label: 'Sad' },
  ];

  return (
    <section className="my-6 p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="text-center mb-3">
        <span className="text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          Community Pulse
        </span>
      </div>

      {/* Centered Large Emojis in a Single Row (matching user screenshot) */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
        {reactions.map((r) => {
          const isSelected = userReaction === r.type;
          const count = counts[r.type] || 0;

          return (
            <button
              key={r.type}
              type="button"
              onClick={() => handleReact(r.type)}
              className={`group flex flex-col items-center justify-center py-2 px-2.5 sm:px-3.5 rounded-2xl transition-all duration-200 transform cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-400 dark:border-blue-600 scale-105 shadow-sm'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800/80 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:scale-105'
              }`}
            >
              {/* Big, Crisp Emoji */}
              <span className="text-3xl sm:text-4xl filter group-hover:scale-110 transition-transform select-none drop-shadow-sm">
                {r.emoji}
              </span>

              {/* Label below emoji */}
              <span
                className={`text-[11px] sm:text-xs font-bold mt-1.5 transition-colors ${
                  isSelected
                    ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {r.label}
              </span>

              {/* Real count pill */}
              <span
                className={`text-[10px] font-semibold mt-0.5 px-2 py-0.5 rounded-full transition-colors ${
                  count > 0
                    ? isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    : 'text-transparent opacity-0'
                }`}
              >
                {count > 0 ? count : '0'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
