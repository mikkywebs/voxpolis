'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArticleData, formatExactTimestamp, getArticleImageUrl, getArticleFallbackUrl, formatCleanSnippet } from '@/lib/news';
import { ExternalLink, AlertCircle, Eye } from 'lucide-react';

interface FeedCardProps {
  article: ArticleData;
  index?: number;
  onCardClick?: () => void;
}

export default function FeedCard({ article, index, onCardClick }: FeedCardProps) {
  const [effectiveViews, setEffectiveViews] = useState<number>(article.views_count || 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
  const displayTitle = (article.title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();
  const articleUrl = `/news/${article.slug}${article.country_code ? `?country=${article.country_code}` : ''}`;

  return (
    <article className="group bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/70 rounded-2xl overflow-hidden p-5 sm:p-6 shadow-sm hover:shadow-lg transition duration-200 flex flex-col justify-between h-full">
      <div>
        {/* News Featured Image Thumbnail */}
        <Link
          href={articleUrl}
          onClick={handleRecordClick}
          className="block mb-4 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-900"
        >
          {/* eslint-disable-next-html-element-suppression */}
          <img
            src={imageUrl}
            alt={article.title}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith(fallbackUrl)) {
                target.src = fallbackUrl;
              }
            }}
            className="w-full h-48 object-cover group-hover:scale-105 transition duration-300"
          />
        </Link>

        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {article.source_name}
          </span>
          <div className="flex items-center gap-2 text-gray-400 text-[11px]">
            {/* Viewer counter badge: Hidden at 0 views, displayed only when real visitors click */}
            {effectiveViews > 0 && (
              <span className="flex items-center gap-1 font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded-full">
                <Eye className="w-3 h-3 text-blue-500" />
                <span>
                  {effectiveViews >= 1000
                    ? `${(effectiveViews / 1000).toFixed(1)}k`
                    : effectiveViews.toLocaleString()}{' '}
                  {effectiveViews === 1 ? 'view' : 'views'}
                </span>
              </span>
            )}
            <span className="font-medium text-gray-400">{formattedTime}</span>
          </div>
        </div>

        {article.is_breaking && (
          <div className="inline-flex items-center gap-1 mb-2 px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
            <AlertCircle className="w-3 h-3" />
            <span>Breaking</span>
          </div>
        )}

        <Link href={articleUrl} onClick={handleRecordClick}>
          <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug line-clamp-2">
            {displayTitle}
          </h2>
        </Link>

        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3 leading-relaxed">
          {formatCleanSnippet(article.snippet)}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {article.tags?.slice(0, 2).map((t) => (
            <span key={t} className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded">
              #{t}
            </span>
          ))}
        </div>

        <Link
          href={articleUrl}
          onClick={handleRecordClick}
          className="font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition inline-flex items-center gap-1"
        >
          <span>Read Full Report</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
}
