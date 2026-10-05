'use client';

import { useState, useEffect } from 'react';

interface EmojiReactionsProps {
  articleId: string;
  slug?: string;
  onRequireAuth?: () => void;
  isLoggedIn?: boolean;
}

export type ReactionType = 'upvote' | 'funny' | 'love' | 'surprised' | 'angry' | 'sad';

export default function EmojiReactions({ articleId, slug }: EmojiReactionsProps) {
  // Canonical ID prefers slug for absolute permanence across refreshes
  const canonicalId = (slug || articleId || '').toLowerCase().trim();

  // Reaction counts stored locally & synced with community tally
  const [counts, setCounts] = useState<{ [key in ReactionType]: number }>({
    upvote: 0,
    funny: 0,
    love: 0,
    surprised: 0,
    angry: 0,
    sad: 0,
  });

  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);

  // Restore counts and active reaction from localStorage + sync with community API
  useEffect(() => {
    if (typeof window === 'undefined' || !canonicalId) return;

    // 1. Immediate restore from localStorage (checks canonical slug first, fallback to articleId)
    try {
      const savedCounts =
        localStorage.getItem(`voxpolis_reactions_${canonicalId}`) ||
        (articleId ? localStorage.getItem(`voxpolis_reactions_${articleId}`) : null);

      if (savedCounts) {
        const parsed = JSON.parse(savedCounts);
        setCounts((prev) => ({
          ...prev,
          ...parsed,
        }));
      }

      const savedUserReaction = (
        localStorage.getItem(`voxpolis_my_reaction_${canonicalId}`) ||
        (articleId ? localStorage.getItem(`voxpolis_my_reaction_${articleId}`) : null)
      ) as ReactionType | null;

      if (savedUserReaction) {
        setUserReaction(savedUserReaction);
      }
    } catch {}

    // 2. Fetch server-aggregated community reactions (works for both guests & members)
    fetch(`/api/reactions?articleId=${encodeURIComponent(canonicalId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.reactions) {
          setCounts((prev) => {
            const merged = { ...prev };
            (Object.keys(data.reactions) as ReactionType[]).forEach((key) => {
              merged[key] = Math.max(merged[key] || 0, data.reactions[key] || 0);
            });
            try {
              localStorage.setItem(`voxpolis_reactions_${canonicalId}`, JSON.stringify(merged));
              if (articleId && articleId !== canonicalId) {
                localStorage.setItem(`voxpolis_reactions_${articleId}`, JSON.stringify(merged));
              }
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});
  }, [canonicalId, articleId]);

  const handleReact = (type: ReactionType) => {
    const prevType = userReaction;
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
        const countsJson = JSON.stringify(nextCounts);
        localStorage.setItem(`voxpolis_reactions_${canonicalId}`, countsJson);
        if (articleId && articleId !== canonicalId) {
          localStorage.setItem(`voxpolis_reactions_${articleId}`, countsJson);
        }

        if (nextReaction) {
          localStorage.setItem(`voxpolis_my_reaction_${canonicalId}`, nextReaction);
          if (articleId && articleId !== canonicalId) {
            localStorage.setItem(`voxpolis_my_reaction_${articleId}`, nextReaction);
          }
        } else {
          localStorage.removeItem(`voxpolis_my_reaction_${canonicalId}`);
          if (articleId) {
            localStorage.removeItem(`voxpolis_my_reaction_${articleId}`);
          }
        }
      } catch {}
    }

    // Fire background POST to API (guests and members can both react freely)
    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: canonicalId,
        type: nextReaction,
        previousType: prevType,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.reactions) {
          setCounts((prev) => ({ ...prev, ...data.reactions }));
        }
      })
      .catch(() => {});
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
    <section className="my-2 sm:my-4 py-2 px-1 sm:px-4 rounded-xl sm:rounded-2xl bg-white/70 dark:bg-gray-900/70 border border-gray-150 dark:border-gray-800 shadow-xs">
      {/* 6 Reaction Emojis in a Single Responsive Row on Mobile and Desktop */}
      <div className="grid grid-cols-6 items-center justify-items-center w-full max-w-xl mx-auto gap-0.5 sm:gap-3">
        {reactions.map((r) => {
          const isSelected = userReaction === r.type;
          const count = counts[r.type] || 0;

          return (
            <button
              key={r.type}
              type="button"
              onClick={() => handleReact(r.type)}
              className={`group flex flex-col items-center justify-center w-full py-1 px-0.5 sm:px-2 rounded-xl transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-400 dark:border-blue-600 scale-105 shadow-xs'
                  : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/80 border border-transparent'
              }`}
            >
              {/* Emoji */}
              <span className="text-2xl sm:text-3xl filter group-hover:scale-110 transition-transform select-none drop-shadow-xs">
                {r.emoji}
              </span>

              {/* Label */}
              <span
                className={`text-[10px] sm:text-xs font-semibold mt-1 transition-colors truncate max-w-full text-center ${
                  isSelected
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {r.label}
              </span>

              {/* Real count pill */}
              <span
                className={`text-[9px] sm:text-[10px] font-semibold mt-0.5 px-1.5 py-0.2 rounded-full transition-colors ${
                  count > 0
                    ? isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    : 'text-transparent opacity-0 pointer-events-none'
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
