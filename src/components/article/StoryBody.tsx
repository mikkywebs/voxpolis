import AdSlot from '@/components/article/AdSlot';
import { ArticleData } from '@/lib/news';

/**
 * Flexible story body (editorial v3): the shape follows the news.
 * Opening paragraphs, then story-specific sections; the analysis section is clearly signposted.
 */
const P = 'text-[17px] sm:text-[19px] leading-8 text-gray-800 dark:text-gray-200';

function paras(text?: string) {
  return (text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function slugId(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

export default function StoryBody({ a, adsAllowed }: { a: ArticleData; adsAllowed: boolean }) {
  const lead = paras(a.lead);
  const sections = (a.sections || []).filter((s) => s.paragraphs?.length);
  const keyPoints = (a.key_points || []).filter(Boolean);
  const midAfter = Math.max(0, Math.floor(sections.length / 2) - 1); // ad between sections, not inside them

  return (
    <div className="space-y-8 font-serif">
      {keyPoints.length > 0 && (
        <section aria-label="Summary" className="rounded-xl bg-slate-100/80 dark:bg-slate-900 p-5 sm:p-6 font-sans">
          <ul className="space-y-2 list-disc pl-5 text-[15px] sm:text-base leading-relaxed text-gray-800 dark:text-gray-200">
            {keyPoints.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </section>
      )}

      {lead.length > 0 && (
        <div className="space-y-5">
          {lead.map((p, i) => (
            <p key={i} className={P}>
              {p}
            </p>
          ))}
        </div>
      )}

      <AdSlot slotLocation="below_dek" isAllowed={adsAllowed} />

      {sections.map((s, i) => {
        const isAnalysis = s.kind === 'analysis';
        return (
          <div key={i} className="space-y-4">
            <section
              id={slugId(s.heading)}
              aria-labelledby={`h-${i}`}
              className={isAnalysis ? 'space-y-4 border-t border-gray-200 dark:border-gray-800 pt-6' : 'space-y-4'}
            >
              {isAnalysis && (
                <span className="inline-block font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-white bg-slate-900 dark:bg-white dark:text-slate-900 px-2 py-1 rounded">
                  Analysis
                </span>
              )}
              <h2 id={`h-${i}`} className="text-2xl sm:text-[26px] leading-tight font-semibold text-gray-900 dark:text-white">
                {s.heading}
              </h2>
              <div className="space-y-5">
                {s.paragraphs.map((p, j) => (
                  <p key={j} className={P}>
                    {p}
                  </p>
                ))}
              </div>
            </section>
            {i === midAfter && sections.length > 1 && <AdSlot slotLocation="mid_article" isAllowed={adsAllowed} />}
          </div>
        );
      })}

      {a.what_to_watch && (
        <p className={P}>
          <strong className="font-sans text-[15px] text-gray-900 dark:text-white">What to watch: </strong>
          {a.what_to_watch}
        </p>
      )}
    </div>
  );
}
