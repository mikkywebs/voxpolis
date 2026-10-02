'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface AIAnalysisSectionProps {
  analysisText: string;
  readAlsoArticle?: {
    title: string;
    slug: string;
  };
}

export default function AIAnalysisSection({ analysisText, readAlsoArticle }: AIAnalysisSectionProps) {
  const rawLines = analysisText
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
    <div className="my-6 pt-4 pb-2 border-t border-b border-gray-200/80 dark:border-gray-800 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="mb-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
          POLICY & CIVIC CONTEXT
        </span>
      </div>

      <div className="space-y-3 text-xs sm:text-sm leading-relaxed">
        {firstPart.map((line, idx) => (
          <p key={idx} className="text-gray-800 dark:text-gray-200 leading-relaxed">
            {line}
          </p>
        ))}

        {readAlsoArticle && (
          <div className="my-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-3 shadow-sm">
            <div className="text-xs">
              <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px] block mb-0.5">
                READ ALSO
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">{readAlsoArticle.title}</span>
            </div>
            <Link
              href={`/news/${readAlsoArticle.slug}`}
              className="shrink-0 flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow transition"
            >
              <span>Read</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {secondPart.map((line, idx) => (
          <p key={idx + 2} className="text-gray-800 dark:text-gray-200 leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
