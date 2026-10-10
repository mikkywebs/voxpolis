'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArticleData, formatExactTimestamp } from '@/lib/news';
import { decodeAllHtmlEntities } from '@/lib/news-rewriter';
import { Flame, ChevronLeft, ChevronRight, Radio } from 'lucide-react';

interface BreakingTickerProps {
  articles: ArticleData[];
  countryCode?: string;
}

export default function BreakingTicker({ articles, countryCode }: BreakingTickerProps) {
  // Prioritize breaking news, fallback to latest articles
  const breakingList = articles.filter((a) => a.is_breaking);
  const tickerItems = breakingList.length > 0 ? breakingList : articles.slice(0, 5);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (tickerItems.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tickerItems.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [tickerItems.length, isPaused]);

  if (!tickerItems || tickerItems.length === 0) {
    return null;
  }

  const activeItem = tickerItems[currentIndex] || tickerItems[0];
  const cleanTitle = decodeAllHtmlEntities((activeItem.title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '')).trim();
  const articleUrl = `/news/${activeItem.slug}${countryCode ? `?country=${countryCode}` : ''}`;
  const timeFormatted = formatExactTimestamp(activeItem.created_at);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="w-full border-b border-gray-200 dark:border-neutral-800 bg-gray-50/90 dark:bg-neutral-900/90 backdrop-blur-xs transition-colors duration-200"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between gap-3 text-xs">
        {/* Left: Breaking Pill & Headline */}
        <div className="flex items-center gap-2.5 overflow-hidden flex-1">
          <div className="shrink-0 flex items-center gap-1.5 bg-red-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Breaking</span>
          </div>

          <Link
            href={articleUrl}
            className="flex items-center gap-2 overflow-hidden group text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <span className="font-bold truncate text-xs group-hover:underline">
              {cleanTitle}
            </span>
            <span className="hidden sm:inline-block text-[11px] text-gray-400 dark:text-neutral-500 shrink-0">
              • {timeFormatted}
            </span>
          </Link>
        </div>

        {/* Right: Counter and Chevron Controls */}
        <div className="flex items-center gap-1 shrink-0 text-gray-500 dark:text-neutral-400">
          <span className="text-[11px] font-semibold tabular-nums px-1 text-gray-400 dark:text-neutral-500">
            {currentIndex + 1}/{tickerItems.length}
          </span>
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev - 1 + tickerItems.length) % tickerItems.length)}
            aria-label="Previous story"
            className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % tickerItems.length)}
            aria-label="Next story"
            className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
