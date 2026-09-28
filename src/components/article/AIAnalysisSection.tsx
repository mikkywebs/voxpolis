'use client';

import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

interface AIAnalysisSectionProps {
  analysisText: string;
  readAlsoArticle?: {
    title: string;
    slug: string;
  };
}

export default function AIAnalysisSection({ analysisText, readAlsoArticle }: AIAnalysisSectionProps) {
  // Filter out ugly meta tags (Reporting Outlet, Geographic Scope, Timestamp, etc.)
  const rawLines = analysisText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const cleanLines = rawLines.filter((line) => {
    const lower = line.toLowerCase();
    return (
      !lower.startsWith('reporting outlet:') &&
      !lower.startsWith('- reporting outlet:') &&
      !lower.startsWith('geographic scope:') &&
      !lower.startsWith('- geographic scope:') &&
      !lower.startsWith('timestamp:') &&
      !lower.startsWith('- timestamp:') &&
      !lower.startsWith('executive fact analysis:') &&
      !lower.startsWith('- headline:') &&
      !lower.startsWith('headline:')
    );
  });

  const lines = cleanLines.length > 0 ? cleanLines : [analysisText];

  const firstPart = lines.slice(0, 2);
  const secondPart = lines.slice(2);

  return (
    <div className="my-6 bg-gray-100/80 dark:bg-gray-900/60 text-gray-900 dark:text-gray-100 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm tracking-wide text-gray-900 dark:text-white">Executive Fact Analysis</h3>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Verified core report facts • Objective & non-partisan synthesis</p>
        </div>
      </div>

      <div className="space-y-3 text-xs sm:text-sm leading-relaxed">
        {firstPart.map((line, idx) => (
          <p key={idx} className="bg-white dark:bg-gray-800/80 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/60 shadow-sm text-gray-800 dark:text-gray-200">
            {line}
          </p>
        ))}

        {/* Embedded "Read Also" Link inserted after 1st or 2nd paragraph */}
        {readAlsoArticle && (
          <div className="my-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-3 shadow-sm">
            <div className="text-xs">
              <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px] block mb-0.5">
                READ ALSO
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">{readAlsoArticle.title}</span>
            </div>
            <Link
              href={`/article/${readAlsoArticle.slug}`}
              className="shrink-0 flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow transition"
            >
              <span>Read</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {secondPart.map((line, idx) => (
          <p key={idx + 2} className="bg-white dark:bg-gray-800/80 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/60 shadow-sm text-gray-800 dark:text-gray-200">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
