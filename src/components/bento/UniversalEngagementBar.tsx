'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

interface UniversalEngagementBarProps {
  articleId: string;
  articleSlug: string;
  countryCode?: string;
  initialLikes?: number;
  initialDislikes?: number;
  initialComments?: number;
  variant?: 'card' | 'hero' | 'compact';
}

export default function UniversalEngagementBar({
  articleId,
  articleSlug,
  countryCode,
  initialLikes = 0,
  initialDislikes = 0,
  initialComments = 0,
  variant = 'card',
}: UniversalEngagementBarProps) {
  const canonicalId = (articleSlug || articleId || '').toLowerCase().trim();

  const [likes, setLikes] = useState<number>(initialLikes);
  const [dislikes, setDislikes] = useState<number>(initialDislikes);
  const [commentsCount, setCommentsCount] = useState<number>(initialComments);
  const [userReaction, setUserReaction] = useState<'upvote' | 'downvote' | null>(null);

  // Restore saved reaction and tallies from localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !canonicalId) return;

    try {
      const savedUser = localStorage.getItem(`voxpolis_reaction_${canonicalId}`) as 'upvote' | 'downvote' | null;
      if (savedUser) setUserReaction(savedUser);

      const savedCounts = localStorage.getItem(`voxpolis_tallies_${canonicalId}`);
      if (savedCounts) {
        const parsed = JSON.parse(savedCounts);
        if (typeof parsed.likes === 'number') setLikes((prev) => Math.max(prev, parsed.likes));
        if (typeof parsed.dislikes === 'number') setDislikes((prev) => Math.max(prev, parsed.dislikes));
        if (typeof parsed.comments === 'number') setCommentsCount((prev) => Math.max(prev, parsed.comments));
      }
    } catch {}

    // Fetch live reaction tallies from server API
    fetch(`/api/reactions?articleId=${encodeURIComponent(canonicalId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.reactions) {
          const up = Number(data.reactions.upvote || 0);
          const down = Number(data.reactions.downvote || 0);
          setLikes((prev) => Math.max(prev, up));
          setDislikes((prev) => Math.max(prev, down));
        }
      })
      .catch(() => {});
  }, [canonicalId]);

  const handleVote = (type: 'upvote' | 'downvote', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const prevReaction = userReaction;
    let nextLikes = likes;
    let nextDislikes = dislikes;
    let nextReaction: 'upvote' | 'downvote' | null = type;

    if (userReaction === type) {
      // Toggle off
      nextReaction = null;
      if (type === 'upvote') nextLikes = Math.max(0, nextLikes - 1);
      if (type === 'downvote') nextDislikes = Math.max(0, nextDislikes - 1);
    } else {
      // Switch vote or set new
      if (userReaction === 'upvote') nextLikes = Math.max(0, nextLikes - 1);
      if (userReaction === 'downvote') nextDislikes = Math.max(0, nextDislikes - 1);

      if (type === 'upvote') nextLikes += 1;
      if (type === 'downvote') nextDislikes += 1;
    }

    setUserReaction(nextReaction);
    setLikes(nextLikes);
    setDislikes(nextDislikes);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        if (nextReaction) {
          localStorage.setItem(`voxpolis_reaction_${canonicalId}`, nextReaction);
        } else {
          localStorage.removeItem(`voxpolis_reaction_${canonicalId}`);
        }
        localStorage.setItem(
          `voxpolis_tallies_${canonicalId}`,
          JSON.stringify({ likes: nextLikes, dislikes: nextDislikes, comments: commentsCount })
        );
      } catch {}
    }

    // Post to API in background
    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: canonicalId,
        type: nextReaction,
        previousType: prevReaction,
      }),
    }).catch(() => {});
  };

  const articleCommentsUrl = `/news/${articleSlug}${countryCode ? `?country=${countryCode}` : ''}#comments`;

  const isHero = variant === 'hero';

  return (
    <div
      onClick={(e) => {
        // Prevent clicking inside engagement bar from triggering parent card link
        e.stopPropagation();
      }}
      className={`flex items-center gap-1.5 sm:gap-2 select-none ${
        isHero
          ? 'bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-white'
          : 'text-gray-600 dark:text-gray-400'
      }`}
    >
      {/* Upvote / Like Button */}
      <button
        type="button"
        onClick={(e) => handleVote('upvote', e)}
        title="Like"
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
          userReaction === 'upvote'
            ? 'bg-blue-600/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold scale-105'
            : isHero
            ? 'hover:bg-white/15 text-white/90 hover:text-white'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
        }`}
      >
        <ThumbsUp
          className={`w-3.5 h-3.5 transition-transform ${
            userReaction === 'upvote' ? 'fill-current scale-110 text-blue-600 dark:text-blue-400' : ''
          }`}
        />
        <span className="tabular-nums text-[11px] sm:text-xs">
          {likes > 0 ? (likes >= 1000 ? `${(likes / 1000).toFixed(1)}k` : likes) : '0'}
        </span>
      </button>

      {/* Downvote / Dislike Button */}
      <button
        type="button"
        onClick={(e) => handleVote('downvote', e)}
        title="Dislike"
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
          userReaction === 'downvote'
            ? 'bg-rose-600/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 font-bold scale-105'
            : isHero
            ? 'hover:bg-white/15 text-white/90 hover:text-white'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
        }`}
      >
        <ThumbsDown
          className={`w-3.5 h-3.5 transition-transform ${
            userReaction === 'downvote' ? 'fill-current scale-110 text-rose-600 dark:text-rose-400' : ''
          }`}
        />
        <span className="tabular-nums text-[11px] sm:text-xs">
          {dislikes > 0 ? (dislikes >= 1000 ? `${(dislikes / 1000).toFixed(1)}k` : dislikes) : '0'}
        </span>
      </button>

      {/* Comments Button */}
      <Link
        href={articleCommentsUrl}
        onClick={(e) => e.stopPropagation()}
        title="View discussion & comments"
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
          isHero
            ? 'hover:bg-white/15 text-white/90 hover:text-white'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span className="tabular-nums text-[11px] sm:text-xs">
          {commentsCount > 0 ? (commentsCount >= 1000 ? `${(commentsCount / 1000).toFixed(1)}k` : commentsCount) : '0'}
        </span>
      </Link>
    </div>
  );
}
