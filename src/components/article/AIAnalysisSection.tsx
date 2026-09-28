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
  // Split analysis into paragraphs or bullet lines to insert the embedded Read Also link after 1st or 2nd item
  const lines = analysisText.split('\n').filter((l) => l.trim().length > 0);

  const firstPart = lines.slice(0, 2);
  const secondPart = lines.slice(2);

  return (
    <div className="my-6 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-blue-800/40 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
          <Sparkles className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-bold text-sm tracking-wide text-blue-200">Executive Fact Analysis</h3>
          <p className="text-[10px] text-gray-400">Verified core report facts • Objective & non-partisan synthesis</p>
        </div>
      </div>

      <div className="space-y-3 text-xs sm:text-sm text-gray-200 leading-relaxed">
        {firstPart.map((line, idx) => (
          <p key={idx} className="bg-white/5 p-3 rounded-xl border border-white/10">
            {line}
          </p>
        ))}

        {/* Embedded "Read Also" Link inserted after 1st or 2nd paragraph */}
        {readAlsoArticle && (
          <div className="my-4 p-4 rounded-xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-400/40 backdrop-blur flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block mb-0.5">
                READ ALSO
              </span>
              <span className="font-semibold text-white">{readAlsoArticle.title}</span>
            </div>
            <Link
              href={`/article/${readAlsoArticle.slug}`}
              className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-300 hover:text-white bg-blue-600 px-3 py-1.5 rounded-lg shadow transition"
            >
              <span>Read</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {secondPart.map((line, idx) => (
          <p key={idx + 2} className="bg-white/5 p-3 rounded-xl border border-white/10">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
