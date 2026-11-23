'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { articlePath } from '@/lib/paths';
import { getCountryByCode } from '@/config/countries';
import { ArticleData, formatExactTimestamp, getArticleImageUrl, getArticleFallbackUrl } from '@/lib/news';
import { decodeAllHtmlEntities } from '@/lib/news-rewriter';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

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
  // Stories are already chosen by pickFeatured (lib/featured.ts): editor picks first, then fresh Nigeria news with photos.
  const slideStories = articles.slice(0, 5);

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
  const articleUrl = articlePath(active);
  const isFeaturedStory = !!active.is_featured;

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
          className="w-full h-full object-cover object-top"
        />
        {/* Strong fade at the bottom so the headline is always readable, whatever the photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 via-35% to-transparent to-75%" />
      </div>

      {/* Top row: one label on the left, photo credit on the right */}
      <div className="absolute top-4 left-4 z-20">
        {isFeaturedStory ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500 text-black">
            <Star className="w-3.5 h-3.5" />
            Featured
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-black/60 text-white backdrop-blur-sm">
            {getCountryByCode(active.country_code).name}
          </span>
        )}
      </div>
      {active.image_credit && active.original_image_url && (
        <span className="absolute top-4 right-4 z-20 max-w-[45%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white/85" title={active.image_credit}>
          {active.image_credit.replace(/^Photo:\s*/, '')}
        </span>
      )}

      {/* Side arrows (show on hover; always tappable on phones) */}
      {slideStories.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev - 1 + slideStories.length) % slideStories.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/45 text-white flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
            aria-label="Previous story"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % slideStories.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/45 text-white flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
            aria-label="Next story"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Text: section and time, headline, one summary line */}
      <div className="relative z-10 p-5 sm:p-7 pb-8 sm:pb-9 space-y-2 max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/75">
          {isFeaturedStory ? `${getCountryByCode(active.country_code).name} · ` : ''}
          {formatExactTimestamp(active.created_at)}
        </p>
        <Link href={articleUrl} onClick={handleCardClick} className="block">
          <h2 className="text-2xl sm:text-3xl md:text-[2.1rem] font-black text-white leading-tight line-clamp-3 [text-shadow:0_1px_12px_rgba(0,0,0,0.6)] hover:underline decoration-2 underline-offset-4">
            {displayTitle}
          </h2>
        </Link>
        {active.snippet && (
          <p className="hidden sm:block text-sm text-white/85 line-clamp-2 leading-relaxed">{decodeAllHtmlEntities(active.snippet)}</p>
        )}
      </div>

      {/* Slide dots */}
      {slideStories.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {slideStories.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'}`}
              aria-label={`Show story ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
