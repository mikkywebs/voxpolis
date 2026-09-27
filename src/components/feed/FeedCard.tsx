'use client';

import Link from 'next/link';
import { ArticleData } from '@/lib/news';
import { ExternalLink, AlertCircle, Sparkles } from 'lucide-react';

interface FeedCardProps {
  article: ArticleData;
}

export default function FeedCard({ article }: FeedCardProps) {
  return (
    <article className="group bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/70 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-lg transition duration-200 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {article.source_name}
          </span>
          <span className="text-gray-400 text-[11px]">{new Date(article.created_at).toLocaleDateString()}</span>
        </div>

        {article.is_breaking && (
          <div className="inline-flex items-center gap-1 mb-2 px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
            <AlertCircle className="w-3 h-3" />
            <span>Breaking</span>
          </div>
        )}

        <Link href={`/article/${article.slug}`}>
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug">
            {article.title}
          </h2>
        </Link>

        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3 leading-relaxed">
          {article.snippet}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {article.image_mode === 'ai_generated' && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
              <Sparkles className="w-3 h-3" /> AI Art
            </span>
          )}
          {article.tags?.slice(0, 2).map((t) => (
            <span key={t} className="text-[10px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded">
              #{t}
            </span>
          ))}
        </div>

        <Link
          href={`/article/${article.slug}`}
          className="font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition inline-flex items-center gap-1"
        >
          <span>Read Full Analysis</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
}
