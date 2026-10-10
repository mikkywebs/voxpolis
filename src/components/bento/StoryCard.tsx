'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArticleData, formatExactTimestamp, getArticleImageUrl, getArticleFallbackUrl } from '@/lib/news';
import { decodeAllHtmlEntities } from '@/lib/news-rewriter';
import UniversalEngagementBar from './UniversalEngagementBar';
import { Eye, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';

interface StoryCardProps {
  article: ArticleData;
  index?: number;
  countryCode?: string;
  variant?: 'standard' | 'adjacent';
  onCardClick?: () => void;
}

export default function StoryCard({
  article,
  index = 0,
  countryCode,
  variant = 'standard',
  onCardClick,
}: StoryCardProps) {
  const [effectiveViews, setEffectiveViews] = useState<number>(article.views_count || 0);

  useEffect(() => {
    if (typeof window === 'undefined' || !article.id) return;
    try {
      const stored = localStorage.getItem(`voxpolis_views_${article.id}`);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setEffectiveViews(Math.max(parsed, article.views_count || 0));
        }
      }
    } catch {}
  }, [article.id, article.views_count]);

  const handleRecordClick = (e?: React.MouseEvent) => {
    if (onCardClick) {
      if (e) e.preventDefault();
      onCardClick();
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`voxpolis_article_${article.slug}`, JSON.stringify(article));
      const key = `voxpolis_views_${article.id}`;
      const prev = parseInt(localStorage.getItem(key) || '0', 10);
      const next = prev + 1;
      localStorage.setItem(key, next.toString());
      setEffectiveViews(next);

      fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id }),
      }).catch(() => {});
    } catch {}
  };

  const imageUrl = getArticleImageUrl(article, index);
  const fallbackUrl = getArticleFallbackUrl(article, index);
  const formattedTime = formatExactTimestamp(article.created_at);
  const displayTitle = decodeAllHtmlEntities((article.title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '')).trim();
  const articleUrl = `/news/${article.slug}${countryCode || article.country_code ? `?country=${countryCode || article.country_code}` : ''}`;

  // 1. ADJACENT CARD (Placed next to Hero Slider in Row 1)
  if (variant === 'adjacent') {
    return (
      <article className="col-span-1 rounded-3xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between h-[380px] sm:h-[420px] md:h-[450px] p-5">
        <div className="flex flex-col">
          {/* Photo Header */}
          <Link
            href={articleUrl}
            onClick={handleRecordClick}
            className="block overflow-hidden rounded-2xl bg-gray-100 dark:bg-neutral-800 h-44 sm:h-52 shrink-0 relative group"
          >
            {/* eslint-disable-next-html-element-suppression */}
            <img
              src={imageUrl}
              alt={article.title}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith(fallbackUrl)) target.src = fallbackUrl;
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
              {article.source_name || 'VoxPolis'}
            </div>
          </Link>

          {/* Time & Views */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-neutral-400 mt-3 mb-2 font-medium">
            <span>{formattedTime}</span>
            {effectiveViews > 0 && (
              <span className="flex items-center gap-1 font-semibold text-gray-500 dark:text-neutral-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                <Eye className="w-3 h-3 text-blue-500" />
                <span>{effectiveViews}</span>
              </span>
            )}
          </div>

          {/* Headline (No additional snippet text underneath) */}
          <Link href={articleUrl} onClick={handleRecordClick}>
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition leading-snug line-clamp-3">
              {displayTitle}
            </h3>
          </Link>
        </div>

        {/* Universal Engagement Bar at Bottom */}
        <div className="pt-3 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between">
          <UniversalEngagementBar
            articleId={article.id}
            articleSlug={article.slug}
            countryCode={countryCode || article.country_code}
          />
          <Link
            href={articleUrl}
            onClick={handleRecordClick}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Read</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </article>
    );
  }

  // 2. STANDARD PHOTO NEWS CARD (Clean, uniform card with image, title & engagement bar)
  return (
    <article className="col-span-1 rounded-3xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between group">
      <div>
        {/* Photo Thumbnail */}
        <Link
          href={articleUrl}
          onClick={handleRecordClick}
          className="block mb-3.5 overflow-hidden rounded-2xl bg-gray-100 dark:bg-neutral-800 h-44 sm:h-48 relative"
        >
          {/* eslint-disable-next-html-element-suppression */}
          <img
            src={imageUrl}
            alt={article.title}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith(fallbackUrl)) target.src = fallbackUrl;
            }}
            className="w-full h-full object-cover group-hover:scale-104 transition duration-300"
          />
        </Link>

        {/* Source & Timestamp */}
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-extrabold text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {article.source_name}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-neutral-500">
            {effectiveViews > 0 && (
              <span className="flex items-center gap-1 font-semibold text-gray-500 dark:text-neutral-400 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                <Eye className="w-3 h-3 text-blue-500" />
                <span>{effectiveViews}</span>
              </span>
            )}
            <span>{formattedTime}</span>
          </div>
        </div>

        {/* Breaking / Featured Pill if any */}
        {article.is_breaking ? (
          <div className="inline-flex items-center gap-1 mb-2 px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-xs">
            <AlertCircle className="w-3 h-3" />
            <span>Breaking</span>
          </div>
        ) : article.is_featured || article.tags?.some((t) => /featured/i.test(t)) ? (
          <div className="inline-flex items-center gap-1 mb-2 px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3 h-3" />
            <span>Featured</span>
          </div>
        ) : null}

        {/* Title (No snippet text underneath as requested by user) */}
        <Link href={articleUrl} onClick={handleRecordClick}>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug line-clamp-3 mb-1">
            {displayTitle}
          </h3>
        </Link>
      </div>

      {/* Universal Engagement Bar at Bottom (Likes, Dislikes, Comments) */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between">
        <UniversalEngagementBar
          articleId={article.id}
          articleSlug={article.slug}
          countryCode={countryCode || article.country_code}
        />

        <Link
          href={articleUrl}
          onClick={handleRecordClick}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition inline-flex items-center gap-1"
        >
          <span>Read</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </article>
  );
}
