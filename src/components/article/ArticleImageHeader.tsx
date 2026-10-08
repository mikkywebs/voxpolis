'use client';

import { ExternalLink, AlertCircle, Clock, Eye, Sparkles } from 'lucide-react';
import { formatExactTimestamp, formatCleanSnippet, BREAKING_NEWS_FALLBACK, getStandardFallbackImage } from '@/lib/news';
import { decodeAllHtmlEntities } from '@/lib/news-rewriter';

interface ArticleImageHeaderProps {
  title: string;
  snippet: string;
  imageMode: 'original' | 'breaking_logo';
  originalImageUrl?: string;
  sourceName: string;
  sourceUrl: string;
  isBreaking?: boolean;
  isFeatured?: boolean;
  viewsCount?: number;
  totalReadingTimeSeconds?: number;
  createdAt?: string;
  author?: string;
}

export default function ArticleImageHeader({
  title,
  snippet,
  imageMode,
  originalImageUrl,
  sourceName,
  sourceUrl,
  isBreaking,
  isFeatured,
  viewsCount = 0,
  totalReadingTimeSeconds = 180,
  createdAt,
  author,
}: ArticleImageHeaderProps) {
  const readingTimeMin = Math.max(1, Math.ceil(totalReadingTimeSeconds / 60));
  const formattedTimestamp = formatExactTimestamp(createdAt);

  const fallbackImage = isBreaking
    ? BREAKING_NEWS_FALLBACK
    : getStandardFallbackImage(title);

  const displayImage =
    originalImageUrl &&
    originalImageUrl.startsWith('http') &&
    !originalImageUrl.includes('google.com/news')
      ? originalImageUrl
      : fallbackImage;

  const cleanTitle = decodeAllHtmlEntities((title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '')).trim();

  return (
    <div className="mb-6 space-y-4">
      {/* Breaking / Featured Badge & Meta Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {isBreaking ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white font-bold text-xs rounded-full uppercase tracking-wider shadow-sm animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Breaking Report</span>
          </div>
        ) : isFeatured ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-500 dark:text-amber-400 font-bold text-xs rounded-full uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Featured News</span>
          </div>
        ) : null}

        <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
          {viewsCount > 0 && (
            <>
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Eye className="w-3.5 h-3.5" />
                <span>
                  {viewsCount.toLocaleString()} {viewsCount === 1 ? 'view' : 'views'}
                </span>
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
            </>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{readingTimeMin} min read</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
        {formattedTimestamp && <span>Published: {formattedTimestamp}</span>}
        {author && (
          <>
            <span>•</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold normal-case">By {author}</span>
          </>
        )}
      </div>

      <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
        {cleanTitle}
      </h1>

      <p className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 border-blue-600 pl-4 py-1">
        {formatCleanSnippet(decodeAllHtmlEntities(snippet))}
      </p>

      {/* Featured Image Treatment: Source Image or Site Default Asset */}
      <div className="mt-4 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 shadow-md">
        <div className="relative group">
          {/* eslint-disable-next-html-element-suppression */}
          <img
            src={displayImage}
            alt={title}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith(fallbackImage)) {
                target.src = fallbackImage;
              }
            }}
            className="w-full h-64 sm:h-96 object-cover"
          />
          <div className="p-2.5 bg-gray-900/90 text-white text-xs flex items-center justify-between gap-2">
            <span className="truncate">Image Credit: {sourceName}</span>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 shrink-0 font-semibold"
            >
              <span>View Original</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
