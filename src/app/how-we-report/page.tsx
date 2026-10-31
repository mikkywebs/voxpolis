import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleChrome from '@/components/article/ArticleChrome';
import Footer from '@/components/layout/Footer';
import { COVERED_COUNTRY_CODES } from '@/config/coverage';
import { getCountryByCode, getCountrySlug } from '@/config/countries';

export const metadata: Metadata = {
  title: 'How We Report',
  description:
    'How the Voxpolis newsroom finds political news, writes it in original language, adds analysis, checks for errors and credits the original reporters.',
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
          <h2 className="text-xl font-black">1. We follow trusted newsrooms</h2>
          <p>
            Each country desk follows the politics sections of established news organisations in that country, plus
            international outlets for global stories. Stories carried by several outlets are treated as more significant,
            and we bring their reporting together so you get the full picture in one place.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">2. We write it in our own words</h2>
          <p>
            Our newsroom system, built on AI language models and editorial rules we set, reads the original report and
            writes a new Voxpolis article. It must keep every name, number and date exactly as reported, attribute claims
            to the people who made them, and never copy the original wording.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">3. We explain what it means</h2>
          <p>
            Every story opens with a short summary. After that, the shape follows the news: a political row, a new bill and
            a court ruling are each told in the way that makes them clearest. Our analysis is always clearly marked, grounded
            in the reported facts, and gives the strongest argument on the other side. We do not endorse parties or candidates.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">4. We ask questions only when they matter</h2>
          <p>
            Some stories raise a real public choice, such as a bill, a policy or a proposal. On those, we invite readers to
            agree or disagree. Routine updates, court procedure, crimes and tragedies do not get a poll.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">5. Automatic checks before publishing</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>The story must be about politics, government or public policy.</li>
            <li>The source must be readable in full; paywalled or cut-off reports are skipped.</li>
            <li>No run of eight or more words may match the original report outside a quotation.</li>
            <li>Stories that repeat one we already published are skipped.</li>
            <li>Only significant stories are written up: we prefer fewer, better articles.</li>
          </ul>
        </section>

        <section id="editor" className="space-y-3 scroll-mt-24">
          <h2 className="text-xl font-black">6. Every story is edited before it is published</h2>
          <p>
            Nothing goes on Voxpolis automatically. Each story starts as a private draft. Our editors read it against the
            original report, check names, numbers and dates, fix anything unclear or unfair, choose the photo, and only then
            publish it. Drafts that fall short are discarded.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">7. We credit and we correct</h2>
          <p>
            Every article links to the original report it is based on, and every photo shows its licence and author. If you spot an error, please{' '}
            <Link href="/corrections" className="text-blue-600 dark:text-blue-400 underline">
              tell us
            </Link>
            . We fix confirmed errors and note the change on the article.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">Our country desks</h2>
          <ul className="flex flex-wrap gap-2">
            {COVERED_COUNTRY_CODES.map((code) => {
              const c = getCountryByCode(code);
              return (
                <li key={code}>
                  <Link
                    href={`/${getCountrySlug(c)}`}
                    className="inline-block px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm hover:border-blue-500"
                  >
                    {c.flag} {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-gray-500">
            Other countries appear when their politics make international news.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
