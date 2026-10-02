'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';

export default function TermsOfServicePage() {
  const [data, setData] = useState({
    title: 'Terms of Service & Editorial Standards',
    subtitle: 'Fair use guidelines for readers, civic participants, and contributing columnists.',
    content: `Welcome to Voxpolis ("voxpolis.app"). By accessing our political intelligence platform, you agree to these Terms of Service.

1. Editorial Mission & Content Use
All news coverage, policy analyses, and primary-source citations are published for civic knowledge, educational transparency, and research purposes.

2. Community Discourse & Commentary
Users participating in political discussions agree to maintain respectful, civil engagement. Defamatory statements, abusive language, promotional spam, and malicious links are strictly removed.

3. Contributing Columnists
Columnist contributions must be original works (minimum 500 words), factually grounded, and adhere to journalistic ethics. Submissions remain subject to editorial desk review prior to publication.`,
  });

  useEffect(() => {
    async function loadTerms() {
      try {
        const res = await fetch('/api/site-pages?page=terms');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setData((prev) => ({ ...prev, ...json.data }));
          }
        }
      } catch (e) {
        console.warn('Using default terms', e);
      }
    }
    loadTerms();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-lg space-y-6">
        <Link href="/">
          <SiteLogo variant="full" className="h-9 w-auto mb-4" />
        </Link>

        <h1 className="text-2xl font-black">{data.title}</h1>
        <p className="text-xs text-gray-500">{data.subtitle}</p>

        <div className="prose dark:prose-invert text-xs space-y-4 leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-300">
          {data.content}
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <Link href="/news" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to News
          </Link>
        </div>
      </div>
    </div>
  );
}
