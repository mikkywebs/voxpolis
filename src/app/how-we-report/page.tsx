import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleChrome from '@/components/article/ArticleChrome';
import Footer from '@/components/layout/Footer';
import { getCountryByCode, getCountrySlug } from '@/config/countries';

export const metadata: Metadata = {
  title: 'How We Report',
  description:
    'Where Voxpolis stories come from, how our editor writes and checks them, how we use photos, and how we correct mistakes.',
  alternates: { canonical: '/how-we-report' },
};

export default function HowWeReportPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <ArticleChrome countryCode="NG" />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8 text-[16px] leading-relaxed">
        <header className="space-y-3">
          <h1 className="text-3xl font-black">How we report</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Voxpolis explains political news clearly. Here is exactly how a story gets onto this site.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-black">1. Where our stories come from</h2>
          <p>
            Our editor follows official statements, press releases, court and government documents, and other outlets&apos;
            reports. When a story relies on another outlet&apos;s reporting, we say so and link to it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">2. Written and checked by our editor</h2>
          <p>
            Every story is written in our own words and checked by our editor before it is published. Names, job titles, numbers
            and dates are checked against the original statement, document or report. Claims are credited to the people who made
            them, and where there is a dispute, the other side&apos;s position is included.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">3. We explain what it means</h2>
          <p>
            Every story opens with a short summary, and the shape follows the news. Where we explain what something means, it is
            clearly marked, grounded in the facts, and fair to the other side. We do not endorse parties or candidates.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">4. We ask questions only when they matter</h2>
          <p>
            Some stories raise a real public choice, such as a bill, a policy or a proposal. On those, we invite readers to agree or
            disagree. Routine updates, court procedure, crimes and tragedies do not get a poll.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">5. Photos</h2>
          <p>
            We only use photos we have the right to use: our own, official handouts that allow reuse, and openly licensed images.
            Every photo shows its credit.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">6. We credit and we correct</h2>
          <p>
            Every source is credited. If you spot an error, please{' '}
            <Link href="/corrections" className="text-blue-600 dark:text-blue-400 underline">
              tell us
            </Link>
            . We fix confirmed errors and note the change on the article.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">What we cover</h2>
          <ul className="flex flex-wrap gap-2">
            {['NG', 'AFRICA', 'WORLD'].map((code) => {
              const c = getCountryByCode(code);
              return (
                <li key={code}>
                  <Link
                    href={`/${getCountrySlug(c)}`}
                    className="inline-block px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm hover:border-blue-500"
                  >
                    {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-gray-500">Mostly Nigeria, then the rest of Africa, and world events that matter to our readers.</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
