'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArticleData, formatExactTimestamp, getArticleImageUrl, getArticleFallbackUrl } from '@/lib/news';
import { decodeAllHtmlEntities } from '@/lib/news-rewriter';
import UniversalEngagementBar from './UniversalEngagementBar';
import { ChevronLeft, ChevronRight, Flame, Sparkles, Eye } from 'lucide-react';

interface HeroPopularitySliderProps {
  articles: ArticleData[];
  countryCode?: string;
  onRecordClick?: (article: ArticleData) => void;
}

export default function HeroPopularitySlider({
  articles,
  countryCode,
  onRecordClick,
}: HeroPopularitySliderProps) {
  // 1. Filter and rank: Featured articles + top popular of last 24h
  const now = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  const candidatePool = [...articles];
  // Sort candidate pool by popularity (views_count) with bonus for featured & fresh items
  candidatePool.sort((a, b) => {
    const aIsFeatured = a.is_featured || a.tags?.some((t) => /featured/i.test(t));
    const bIsFeatured = b.is_featured || b.tags?.some((t) => /featured/i.test(t));
    if (aIsFeatured && !bIsFeatured) return -1;
    if (!aIsFeatured && bIsFeatured) return 1;

    const aAge = now - new Date(a.created_at).getTime();
    const bAge = now - new Date(b.created_at).getTime();
    const aIs24h = aAge <= twentyFourHoursMs;
    const bIs24h = bAge <= twentyFourHoursMs;

    if (aIs24h && !bIs24h) return -1;
    if (!aIs24h && bIs24h) return 1;

    return (b.views_count || 0) - (a.views_count || 0);
  });

  const slideStories = candidatePool.slice(0, 5);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (slideStories.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideStories.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [slideStories.length, isPaused]);

  if (!slideStories || slideStories.length === 0) {
    return null;
  }

  const active = slideStories[currentIndex] || slideStories[0];
  const imageUrl = getArticleImageUrl(active, currentIndex);
  const fallbackUrl = getArticleFallbackUrl(active, currentIndex);
  const displayTitle = decodeAllHtmlEntities((active.title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '')).trim();
  const articleUrl = `/news/${active.slug}${countryCode ? `?country=${countryCode}` : ''}`;
  const isFeaturedStory = active.is_featured || active.tags?.some((t) => /featured/i.test(t));

  const handleCardClick = () => {
    if (onRecordClick) onRecordClick(active);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="col-span-1 md:col-span-2 lg:col-span-2 relative rounded-3xl overflow-hidden border border-gray-200 dark:border-neutral-800 bg-neutral-900 shadow-md group h-[380px] sm:h-[420px] md:h-[450px] flex flex-col justify-end"
    >
      {/* Background Cover Image with Gradient */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-html-element-suppression */}
        <img
          src={imageUrl}
          alt={active.title}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.endsWith(fallbackUrl)) {
              target.src = fallbackUrl;
            }
          }}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/20" />
      </div>

      {/* Slide Navigation Controls (< >) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => setCurrentIndex((prev) => (prev - 1 + slideStories.length) % slideStories.length)}
          className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-bold text-white/80 tabular-nums px-1">
          {currentIndex + 1}/{slideStories.length}
        </span>
        <button
          type="button"
          onClick={() => setCurrentIndex((prev) => (prev + 1) % slideStories.length)}
          className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Featured / Popular Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {isFeaturedStory ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/90 text-white shadow-xs backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Featured Policy</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-red-600/90 text-white shadow-xs backdrop-blur-xs">
            <Flame className="w-3.5 h-3.5" />
            <span>Top Popular</span>
          </span>
        )}
      </div>

      {/* Slide Content Overlay */}
      <div className="relative z-10 p-5 sm:p-6 md:p-8 space-y-3">
        {/* Publisher & Freshness Row */}
        <div className="flex items-center gap-2 text-xs text-white/80 font-semibold flex-wrap">
          <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[11px] text-white">
            {active.source_name || 'VoxPolis'}
          </span>
          <span>•</span>
          <span>{formatExactTimestamp(active.created_at)}</span>
          {active.views_count > 0 && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                <Eye className="w-3 h-3" />
                <span>{active.views_count.toLocaleString()} views</span>
              </span>
            </>
          )}
        </div>

        {/* Headline */}
        <Link href={articleUrl} onClick={handleCardClick} className="block group/title">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white group-hover/title:text-blue-400 transition-colors leading-tight line-clamp-2 sm:line-clamp-3 drop-shadow-xs">
            {displayTitle}
          </h2>
        </Link>

        {/* Snippet */}
        {active.snippet && (
          <p className="text-xs sm:text-sm text-neutral-200 line-clamp-2 max-w-2xl leading-relaxed">
            {decodeAllHtmlEntities(active.snippet)}
          </p>
        )}

        {/* Bottom Bar: Universal Reaction Bar + Slide Dots */}
        <div className="pt-2 flex items-center justify-between gap-4">
          {/* Universal Engagement Bar on the Slider! */}
          <UniversalEngagementBar
            articleId={active.id}
            articleSlug={active.slug}
            countryCode={countryCode}
            initialLikes={0}
            initialDislikes={0}
            initialComments={0}
            variant="hero"
          />

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {slideStories.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Jump to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
