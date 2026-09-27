'use client';

import SiteLogo from '@/components/branding/SiteLogo';
import { ExternalLink, Sparkles, AlertCircle } from 'lucide-react';

interface ArticleImageHeaderProps {
  title: string;
  snippet: string;
  imageMode: 'original' | 'ai_generated' | 'breaking_logo';
  originalImageUrl?: string;
  aiImageUrl?: string;
  sourceName: string;
  sourceUrl: string;
  isBreaking?: boolean;
}

export default function ArticleImageHeader({
  title,
  snippet,
  imageMode,
  originalImageUrl,
  aiImageUrl,
  sourceName,
  sourceUrl,
  isBreaking,
}: ArticleImageHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      {/* Breaking Badge */}
      {isBreaking && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white font-bold text-xs rounded-full uppercase tracking-wider shadow-sm animate-pulse">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Breaking News</span>
        </div>
      )}

      <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
        {title}
      </h1>

      <p className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300 leading-relaxed border-l-4 border-blue-600 pl-4 py-1">
        {snippet}
      </p>

      {/* Image Mode Treatments */}
      <div className="mt-4 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 shadow-md">
        {imageMode === 'original' && originalImageUrl && (
          <div className="relative group">
            {/* eslint-disable-next-html-element-suppression */}
            <img src={originalImageUrl} alt={title} className="w-full h-64 sm:h-96 object-cover" />
            <div className="p-2.5 bg-gray-900/90 text-white text-xs flex items-center justify-between gap-2">
              <span className="truncate">Image Source: {sourceName}</span>
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
        )}

        {imageMode === 'ai_generated' && (
          <div className="relative">
            {/* eslint-disable-next-html-element-suppression */}
            <img
              src={aiImageUrl || 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80'}
              alt="AI Symbolic Representation"
              className="w-full h-64 sm:h-96 object-cover filter contrast-105 saturate-110"
            />
            <div className="p-2.5 bg-purple-950/90 text-purple-200 text-xs flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI-Generated Stylized Symbolic Artwork (Non-identifiable representation)</span>
            </div>
          </div>
        )}

        {imageMode === 'breaking_logo' && (
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none" />
            <SiteLogo variant="light" className="h-12 sm:h-16 w-auto mb-4" />
            <span className="bg-red-600/90 text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-full uppercase tracking-widest border border-red-400/40 shadow-lg">
              VOSPOLIS OFFICIAL BREAKING REPORT
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
