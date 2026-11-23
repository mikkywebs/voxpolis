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
    { type: 'funny', emoji: '😂', label: 'Funny' },
    { type: 'love', emoji: '❤️', label: 'Love' },
    { type: 'surprised', emoji: '😮', label: 'Surprised' },
    { type: 'angry', emoji: '😡', label: 'Angry' },
    { type: 'sad', emoji: '😢', label: 'Sad' },
  ];

  return (
    <div role="group" aria-label="React to this story" className="flex flex-wrap items-center gap-1.5">
      {reactions.map((r) => {
        const isSelected = userReaction === r.type;
        const count = counts[r.type] || 0;
        return (
          <button
            key={r.type}
            type="button"
            onClick={() => handleReact(r.type)}
            title={r.label}
            aria-label={`${r.label}${count ? ` (${count})` : ''}`}
            aria-pressed={isSelected}
            className={`group inline-flex h-9 items-center gap-1 rounded-full border px-2.5 text-sm transition ${
              isSelected
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-lg leading-none transition-transform group-hover:scale-125 select-none">{r.emoji}</span>
            {count > 0 && <span className="text-xs font-semibold tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
