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
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">
        Related Political Coverage
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {articles.slice(0, 4).map((art) => (
          <Link
            key={art.id}
            href={`/news/${art.slug}`}
            className="group p-4 bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-xl shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                {art.source_name}
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-2">
                {art.title}
              </h4>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{art.snippet}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
