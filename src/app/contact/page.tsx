import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleChrome from '@/components/article/ArticleChrome';
import Footer from '@/components/layout/Footer';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Contact Voxpolis',
  description: 'Email the Voxpolis editor with story tips, corrections, press requests or questions about our coverage.',
  alternates: { canonical: '/contact' },
};

const DEFAULTS = {
  email: 'contact@voxpolis.app',
  press_inquiries: 'press@voxpolis.app',
  response_time: 'We aim to reply within two working days.',
};

async function contactData() {
  try {
    const { data } = await supabaseAdmin.from('site_pages').select('data').eq('page_key', 'contact').maybeSingle();
    const d = (data?.data as Record<string, string>) || {};
    return {
      email: d.email || DEFAULTS.email,
      press_inquiries: d.press_inquiries || DEFAULTS.press_inquiries,
      response_time: d.response_time || DEFAULTS.response_time,
    };
  } catch {
    return DEFAULTS;
  }
}

export default async function ContactPage() {
  const d = await contactData();
  // Each button opens the reader's own email app with the subject filled in, so nothing gets lost.
  const channels = [
    { title: 'Story tips', text: 'Something we should look into? Send what you know and any documents.', to: d.email, subject: 'Story tip' },
    { title: 'Corrections', text: 'Tell us the story and what is wrong. We fix confirmed errors and note the change.', to: d.email, subject: 'Correction request' },
    { title: 'Opinion pieces', text: 'Want to write for Voxpolis? Send a short pitch first.', to: d.email, subject: 'Opinion pitch' },
    { title: 'Press and partnerships', text: 'Media requests, republishing and partnerships.', to: d.press_inquiries, subject: 'Press enquiry' },
  ];
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <ArticleChrome countryCode="NG" />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8 text-[16px] leading-relaxed">
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black">Contact Voxpolis</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            The quickest way to reach us is by email:{' '}
            <a href={`mailto:${d.email}`} className="text-blue-600 dark:text-blue-400 underline font-semibold">
              {d.email}
            </a>
            . {d.response_time}
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {channels.map((c) => (
            <li key={c.title} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-2">
              <h2 className="text-lg font-black">{c.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{c.text}</p>
              <a
                href={`mailto:${c.to}?subject=${encodeURIComponent(c.subject)}`}
                className="inline-block mt-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold"
              >
                Email {c.to}
              </a>
            </li>
          ))}
        </ul>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Read how we work in <Link href="/how-we-report" className="text-blue-600 dark:text-blue-400 underline">How we report</Link> and our{' '}
          <Link href="/corrections" className="text-blue-600 dark:text-blue-400 underline">corrections policy</Link>.
        </p>
      </main>
      <Footer />
    </div>
  );
}
