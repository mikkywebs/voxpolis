'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';

export default function PrivacyPolicyPage() {
  const [data, setData] = useState({
    title: 'Privacy Policy & Data Protection Standards',
    subtitle: 'Voxpolis adheres to strict global data privacy standards, GDPR, and NDPR protocols.',
    content: `Voxpolis ("voxpolis.app") is committed to protecting your personal data and upholding GDPR, CCPA, and global privacy standards.

1. Data We Collect
We collect minimal account information (email, name, primary country preference) for registered readers and accredited columnists. We do not sell personal data to third parties.

2. Cookies & Preferences
Essential cookies are utilized to preserve regional settings and authentication status. Analytical and advertisement preferences can be managed directly via our cookie preference panel.

3. Civic Integrity & Moderation
Public discussion submissions and columnist drafts are reviewed against community safety guidelines to prevent defamation, hate speech, and harassment.`,
  });

  useEffect(() => {
    async function loadPrivacy() {
      try {
        const res = await fetch('/api/site-pages?page=privacy');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setData((prev) => ({ ...prev, ...json.data }));
          }
        }
      } catch (e) {
        console.warn('Using default privacy policy', e);
      }
    }
    loadPrivacy();
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
          <Link href="/feed" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to Voxpolis Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
