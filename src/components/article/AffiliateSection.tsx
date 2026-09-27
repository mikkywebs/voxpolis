'use client';

import { ExternalLink, Tag } from 'lucide-react';

interface AffiliateSectionProps {
  label?: string;
  url?: string;
}

export default function AffiliateSection({ label, url }: AffiliateSectionProps) {
  if (!label || !url) return null;

  return (
    <div className="my-6 p-4 rounded-xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Tag className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest block">
            SPONSORED / AFFILIATE
          </span>
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{label}</span>
        </div>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow transition"
      >
        <span>Explore Offer</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
