import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleChrome from '@/components/article/ArticleChrome';
import Footer from '@/components/layout/Footer';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'About Voxpolis',
  description: 'Voxpolis explains Nigerian, African and world politics clearly: who did what, why it matters and what comes next.',
  alternates: { canonical: '/about' },
};

const DEFAULTS = {
  title: 'Political news, explained',
  subtitle:
    'Voxpolis explains the political stories that matter: mostly Nigeria, then the rest of Africa, and the world events that affect them. Who did what, why it matters, and what comes next.',
  mission:
    'Our aim is simple: clear, fair and accurate political news that anyone can read for free, with room for readers to say what they think.',
  headquarters: 'Abuja, Nigeria',
  founded_year: '2026',
};

async function pageData() {
  try {
    const { data } = await supabaseAdmin.from('site_pages').select('data').eq('page_key', 'about').maybeSingle();
    return { ...DEFAULTS, ...((data?.data as Record<string, string>) || {}) };
  } catch {
    return DEFAULTS;
  }
}

export default async function AboutPage() {
  const d = await pageData();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <ArticleChrome countryCode="NG" />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8 text-[16px] leading-relaxed">
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black">{d.title}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">{d.subtitle}</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-black">What we cover</h2>
          <p>
            Most of our stories are about Nigerian politics: the Presidency, the National Assembly, the courts, the parties and
            the states. We also cover major political news from across Africa, and world events when they matter to our readers.
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            <li><Link href="/nigeria" className="inline-block px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-500">Nigeria</Link></li>
            <li><Link href="/africa" className="inline-block px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-500">Africa</Link></li>
            <li><Link href="/world" className="inline-block px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-500">World</Link></li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">How a story is made</h2>
          <p>
            Our editor follows official statements, press releases, court and government documents, and other outlets&apos;
            reports. Every story is written and checked by our editor before it is published, and every source is credited.
            You can read the details in{' '}
            <Link href="/how-we-report" className="text-blue-600 dark:text-blue-400 underline">
              How we report
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">Our standards</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Independent.</strong> We don&apos;t support any party or candidate, and no one pays to shape our coverage.</li>
            <li><strong>Fair.</strong> Claims are credited to the people who made them, and the other side&apos;s position is included where there is a dispute.</li>
            <li><strong>Facts first, analysis labelled.</strong> Where we explain what something means, it is clearly marked.</li>
            <li><strong>Free to read.</strong> No paywall.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black">Our mission</h2>
          <p>{d.mission}</p>
        </section>

        <section className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>Based in {d.headquarters}. Founded {d.founded_year}.</p>
          <p>
            Spotted an error? <Link href="/corrections" className="text-blue-600 dark:text-blue-400 underline">Tell us</Link>. Anything else?{' '}
            <Link href="/contact" className="text-blue-600 dark:text-blue-400 underline">Contact us</Link>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
