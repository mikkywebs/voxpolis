'use client';

import Link from 'next/link';
import { ArticleData } from '@/lib/news';

interface RelatedArticlesSectionProps {
  articles: ArticleData[];
}

export default function RelatedArticlesSection({ articles }: RelatedArticlesSectionProps) {
  if (!articles || articles.length === 0) return null;

  return (
    <div className="my-8">
      <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-800 pb-2 flex items-center justify-between">
        <span>Related News</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Voxpolis Desk</span>
      </h3>

      {/* Grid: 1 column on mobile (max 3), 2 columns on desktop (max 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {articles.slice(0, 4).map((art, idx) => (
          <Link
            key={art.id}
            href={`/news/${art.slug}`}
            className={`group p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500/50 transition flex flex-col justify-between ${
              idx === 3 ? 'hidden sm:flex' : 'flex'
            }`}
          >
            <div>
              {/* Featured Image Thumbnail */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-800">
                {/* eslint-disable-next-html-element-suppression */}
                <img
                  src={art.original_image_url || '/breaking-news-banner.png'}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>

              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                {art.source_name}
              </span>
              <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2 leading-snug">
                {art.title.replace(/\s*[-–—|]\s*Voxpolis.*$/i, '')}
              </h4>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2.5 line-clamp-2 leading-relaxed">
              {art.snippet}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
