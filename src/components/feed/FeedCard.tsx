'use client';

import Link from 'next/link';
import { ArticleData, formatExactTimestamp, getArticleImageUrl, formatCleanSnippet } from '@/lib/news';
import { ExternalLink, AlertCircle, Eye } from 'lucide-react';

interface FeedCardProps {
  article: ArticleData;
}

export default function FeedCard({ article }: FeedCardProps) {
  const viewsFormatted =
    article.views_count >= 1000
      ? `${(article.views_count / 1000).toFixed(1)}k`
      : article.views_count.toString();

  const imageUrl = getArticleImageUrl(article);

  const formattedTime = formatExactTimestamp(article.created_at);
  const displayTitle = (article.title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();

  return (
    <article className="group bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/70 rounded-2xl overflow-hidden p-5 sm:p-6 shadow-sm hover:shadow-lg transition duration-200 flex flex-col justify-between h-full">
      <div>
        {/* News Featured Image Thumbnail */}
        <Link href={`/news/${article.slug}`} className="block mb-4 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-900">
          {/* eslint-disable-next-html-element-suppression */}
          <img
            src={imageUrl}
            alt={article.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/breaking-news-banner.png';
            }}
            className="w-full h-48 object-cover group-hover:scale-105 transition duration-300"
          />
        </Link>

        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {article.source_name}
          </span>
          <div className="flex items-center gap-2 text-gray-400 text-[11px]">
            {/* Viewer counter badge */}
            <span className="flex items-center gap-1 font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded-full">
              <Eye className="w-3 h-3 text-blue-500" />
              <span>{viewsFormatted} views</span>
            </span>
            <span className="font-medium text-gray-400">{formattedTime}</span>
          </div>
        </div>

        {article.is_breaking && (
          <div className="inline-flex items-center gap-1 mb-2 px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
            <AlertCircle className="w-3 h-3" />
            <span>Breaking</span>
          </div>
        )}

        <Link href={`/news/${article.slug}`}>
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
          href={`/news/${article.slug}`}
          className="font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition inline-flex items-center gap-1"
        >
          <span>Read Full Report</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
}
