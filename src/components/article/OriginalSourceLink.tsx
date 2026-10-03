'use client';

import { ExternalLink, ShieldCheck } from 'lucide-react';

interface OriginalSourceLinkProps {
  sourceName: string;
  sourceUrl: string;
}

export default function OriginalSourceLink({ sourceName, sourceUrl }: OriginalSourceLinkProps) {
  if (!sourceUrl || sourceUrl === '#') return null;

  return (
    <div className="my-8 p-5 sm:p-6 rounded-2xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Source Dispatch • {sourceName}</span>
        </span>
      </div>

      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        This briefing was synthesized from primary journalistic dispatches reported by <strong className="text-gray-900 dark:text-white font-semibold">{sourceName}</strong> for civic transparency and democratic awareness. Readers can inspect the primary reporting directly at the publisher&apos;s portal.
      </p>

      <div className="pt-1">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow transition"
        >
          <span>Read Primary Reporting on {sourceName}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

