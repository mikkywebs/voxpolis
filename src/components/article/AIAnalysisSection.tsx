'use client';

import Link from 'next/link';
import { ArrowRight, Scale } from 'lucide-react';

interface AIAnalysisSectionProps {
  analysisText: string;
  readAlsoArticle?: {
    title: string;
    slug: string;
  };
}

export default function AIAnalysisSection({ analysisText, readAlsoArticle }: AIAnalysisSectionProps) {
  const rawLines = (analysisText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

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
      !lower.startsWith('headline:') &&
      !lower.startsWith('news recap:') &&
      !lower.startsWith('- news recap:') &&
      !lower.startsWith('• news recap:') &&
      !lower.includes('only available in paid plans') &&
      !lower.includes('appeared first on') &&
      !lower.includes('policy directives and structural governance protocols were introduced for public review')
    );
  });

  const cleanLineText = (text: string) => {
    return text
      .replace(/^•\s*/, '')
      .replace(/^Strategic Context:\s*/i, '')
      .replace(/^Key Takeaway:\s*/i, '')
      .replace(/^Analysis of Reported Facts:\s*/i, '')
      .replace(/^Fact \d+:\s*/i, '')
      .trim();
  };

  const lines = (cleanLines.length > 0 ? cleanLines : [analysisText])
    .map(cleanLineText)
    .filter((l) => l.length > 0);

  if (lines.length === 0 && !readAlsoArticle) {
    return null;
  }

  const firstPart = lines.slice(0, 2);
  const secondPart = lines.slice(2);

  return (
    <div className="my-8 pt-6 pb-4 border-t border-b border-gray-200/80 dark:border-gray-800 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-[12px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
          UNBIASED ANALYSIS & VERDICT
        </span>
      </div>

      <div className="space-y-4 text-sm sm:text-base leading-relaxed text-gray-800 dark:text-gray-200 font-normal">
        {firstPart.map((line, idx) => (
          <p key={idx} className="leading-relaxed">
            {line}
          </p>
        ))}

        {readAlsoArticle && (
          <div className="my-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/90 dark:from-gray-900 dark:via-blue-950/30 dark:to-gray-900 border border-blue-200/80 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow transition">
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                READ ALSO
              </span>
              <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                {readAlsoArticle.title.replace(/\s*[-–—|]\s*Voxpolis.*$/i, '')}
              </h4>
            </div>
            <Link
              href={`/news/${readAlsoArticle.slug}`}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow transition"
            >
              <span>Read Story</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {secondPart.map((line, idx) => (
          <p key={idx + 2} className="leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
