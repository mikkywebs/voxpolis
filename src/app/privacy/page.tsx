import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleChrome from '@/components/article/ArticleChrome';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What personal data Voxpolis collects, how it is used, how advertising cookies work, and how to contact us about your data.',
  alternates: { canonical: '/privacy' },
};

const UPDATED = '25 November 2026';
const EMAIL = 'contact@voxpolis.app';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <ArticleChrome countryCode="NG" />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 space-y-7 text-[16px] leading-relaxed">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black">Privacy policy</h1>
          <p className="text-sm text-gray-500">Last updated: {UPDATED}</p>
          <p>
            This policy explains what personal data Voxpolis (voxpolis.app) collects, why, and the choices you have. You can read
            Voxpolis without an account.
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-black">What we collect</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>If you create an account:</strong> your email address, the name and username you choose, and your sign-in details (handled by our login provider).</li>
            <li><strong>What you post:</strong> comments, poll votes and reactions, linked to your account.</li>
            <li><strong>Reading statistics:</strong> how many times each story is read. We use this to see which stories readers find useful.</li>
            <li><strong>If you email us:</strong> your email address and what you send.</li>
            <li><strong>Approximate location for the weather box:</strong> our host tells us roughly which city your connection comes from, so we can show your local weather. It is used only for that and is not stored.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black">How we use it</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To run your account and show your name on comments and polls.</li>
            <li>To keep the site safe and stop spam and abuse.</li>
            <li>To improve our coverage.</li>
            <li>To reply when you contact us.</li>
          </ul>
          <p>We do not sell your personal data.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black">Cookies and similar storage</h2>
          <p>
            We use cookies and your browser&apos;s local storage to keep you signed in and remember settings such as dark mode.
            These are needed for the site to work.
          </p>
        </section>

        <section className="space-y-2" id="advertising">
          <h2 className="text-xl font-black">Advertising</h2>
          <p>
            Voxpolis may show ads to keep the site free. Third-party vendors, including Google, use cookies to serve ads based on
            your previous visits to this and other websites. Google&apos;s use of advertising cookies enables it and its partners to
            serve ads to you based on your visits to this site and/or other sites on the internet.
          </p>
          <p>
            You can opt out of personalised advertising in{' '}
            <a href="https://adssettings.google.com" target="_blank" rel="noopener" className="text-blue-600 dark:text-blue-400 underline">
              Google Ads Settings
            </a>
            , or opt out of some other vendors&apos; use of cookies at{' '}
            <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener" className="text-blue-600 dark:text-blue-400 underline">
              aboutads.info
            </a>
            . Learn more about{' '}
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener" className="text-blue-600 dark:text-blue-400 underline">
              how Google uses data from sites that use its services
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black">Who else handles your data</h2>
          <p>
            We use trusted service providers to run Voxpolis: hosting (Vercel), our database and sign-in (Supabase), and, where ads
            are shown, advertising partners as described above. They only process data to provide their service to us.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black">How long we keep it</h2>
          <p>We keep account data while your account is open. Comments stay published unless removed by you or by us under our <Link href="/terms" className="text-blue-600 dark:text-blue-400 underline">terms</Link>.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black">Your rights</h2>
          <p>
            You can ask to see, correct or delete your personal data, or close your account, by emailing{' '}
            <a href={`mailto:${EMAIL}?subject=Privacy%20request`} className="text-blue-600 dark:text-blue-400 underline">{EMAIL}</a>. Depending on
            where you live, laws such as Nigeria&apos;s Data Protection Act 2023 or the GDPR may give you further rights, including the
            right to complain to your data protection authority.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black">Children</h2>
          <p>Voxpolis is not aimed at children under 13, and we do not knowingly collect their data.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-black">Changes</h2>
          <p>If we change this policy, we will update the date at the top of this page.</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
