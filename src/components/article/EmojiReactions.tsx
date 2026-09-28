'use client';

import { useState } from 'react';

interface EmojiReactionsProps {
  articleId: string;
  onRequireAuth?: () => void;
  isLoggedIn?: boolean;
}

export default function EmojiReactions({ articleId, onRequireAuth, isLoggedIn = true }: EmojiReactionsProps) {
  // Real reactions stored locally per article ID (starts at 0)
  const [counts, setCounts] = useState<{ [key: string]: number }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`voxpolis_reactions_${articleId}`);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return { thumbs_up: 0, sad: 0, angry: 0, insightful: 0 };
  });

  const [userReaction, setUserReaction] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`voxpolis_my_reaction_${articleId}`);
    }
    return null;
  });

  const handleReact = (type: 'thumbs_up' | 'sad' | 'angry' | 'insightful') => {
    // Both visitors and members can react in real time
    let nextCounts = { ...counts };
    let nextReaction: string | null = type;

    if (userReaction === type) {
      nextReaction = null;
      nextCounts[type] = Math.max(0, (nextCounts[type] || 0) - 1);
    } else {
      if (userReaction && nextCounts[userReaction]) {
        nextCounts[userReaction] = Math.max(0, nextCounts[userReaction] - 1);
      }
      nextCounts[type] = (nextCounts[type] || 0) + 1;
    }

    setUserReaction(nextReaction);
    setCounts(nextCounts);

    if (typeof window !== 'undefined') {
      localStorage.setItem(`voxpolis_reactions_${articleId}`, JSON.stringify(nextCounts));
      if (nextReaction) {
        localStorage.setItem(`voxpolis_my_reaction_${articleId}`, nextReaction);
      } else {
        localStorage.removeItem(`voxpolis_my_reaction_${articleId}`);
      }
    }
  };

  const reactions = [
    { type: 'thumbs_up', emoji: '👍', label: 'Agree' },
    { type: 'sad', emoji: '😢', label: 'Sad' },
    { type: 'angry', emoji: '😡', label: 'Angry' },
    { type: 'insightful', emoji: '💡', label: 'Insightful' },
  ] as const;

  return (
    <div className="py-3 border-y border-gray-200 dark:border-gray-800 my-4 flex items-center justify-between flex-wrap gap-2">
      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Community Pulse
      </span>
      <div className="flex items-center gap-2">
        {reactions.map((r) => {
          const isSelected = userReaction === r.type;
          return (
            <button
              key={r.type}
              onClick={() => handleReact(r.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition transform active:scale-95 ${
                isSelected
                  ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-400 text-blue-800 dark:text-blue-200 ring-2 ring-blue-500/20'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-sm">{r.emoji}</span>
              <span>{counts[r.type]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
