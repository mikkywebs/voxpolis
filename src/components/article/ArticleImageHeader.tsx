'use client';

import { ExternalLink, AlertCircle, Clock, Eye } from 'lucide-react';
import { formatExactTimestamp } from '@/lib/news';

interface ArticleImageHeaderProps {
  title: string;
  snippet: string;
  imageMode: 'original' | 'breaking_logo';
  originalImageUrl?: string;
  sourceName: string;
  sourceUrl: string;
  isBreaking?: boolean;
  viewsCount?: number;
  totalReadingTimeSeconds?: number;
  createdAt?: string;
}

export default function ArticleImageHeader({
  title,
  snippet,
  imageMode,
  originalImageUrl,
  sourceName,
  sourceUrl,
  isBreaking,
  viewsCount = 0,
  totalReadingTimeSeconds = 180,
  createdAt,
}: ArticleImageHeaderProps) {
  const readingTimeMin = Math.max(1, Math.ceil(totalReadingTimeSeconds / 60));
  const formattedTimestamp = formatExactTimestamp(createdAt);

  const displayImage = (originalImageUrl && originalImageUrl.startsWith('http'))
    ? originalImageUrl
    : '/breaking-news-banner.png';

  const cleanTitle = (title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();

  return (
    <div className="mb-6 space-y-4">
      {/* Breaking Badge & Meta Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {isBreaking && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white font-bold text-xs rounded-full uppercase tracking-wider shadow-sm animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Breaking Report</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/80 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
          {viewsCount >= 100 && (
            <>
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Eye className="w-3.5 h-3.5" />
                <span>{viewsCount.toLocaleString()} Readers</span>
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

      {formattedTimestamp && (
        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
          Published: {formattedTimestamp}
        </div>
      )}

      <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
        {cleanTitle}
      </h1>

      <p className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 border-blue-600 pl-4 py-1">
        {snippet}
      </p>

      {/* Featured Image Treatment: Source Image or Site Default Asset */}
      <div className="mt-4 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 shadow-md">
        <div className="relative group">
          {/* eslint-disable-next-html-element-suppression */}
          <img src={displayImage} alt={title} className="w-full h-64 sm:h-96 object-cover" />
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
