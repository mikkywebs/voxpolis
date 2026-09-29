'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import FeedCard from '@/components/feed/FeedCard';
import { ALL_COUNTRIES, CountryConfig } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData } from '@/lib/news';
import { Archive, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CountryArchivePage() {
  const params = useParams();
  const router = useRouter();
  const countrySlug = (params?.countrySlug as string || 'nigeria').toLowerCase();

  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(ALL_COUNTRIES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const matched = ALL_COUNTRIES.find((c) => {
      const nameSlug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return nameSlug === countrySlug || c.code.toLowerCase() === countrySlug;
    }) || ALL_COUNTRIES[0];

    setSelectedCountry(matched);
    setSelectedLanguage(matched.languages[0]?.code || 'en');
  }, [countrySlug]);

  useEffect(() => {
    async function loadArchived() {
      setLoading(true);
      const data = await fetchArticlesForCountry(selectedCountry.code, selectedLanguage);
      const archived = data.filter((a) => a.is_archived);
      setArticles(archived.length > 0 ? archived : data);
      setLoading(false);
    }
    if (selectedCountry) {
      loadArchived();
    }
  }, [selectedCountry, selectedLanguage]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
      <Header
        selectedCountry={selectedCountry}
        onSelectCountry={(c) => {
          const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          router.push(`/${slug}/archive`);
        }}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Back Link */}
        <div className="mb-4">
          <Link
            href={`/${countrySlug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to {selectedCountry.name} Live Feed</span>
          </Link>
        </div>

        {/* Header Banner */}
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-xl border border-blue-800/40">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {selectedCountry.flag} {selectedCountry.name} Political Archive
              </h1>
              <p className="text-xs text-gray-300">
                Preserved historical political updates & governance records.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            All historical reports remain fully indexed and accessible permanently at their original canonical URLs.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500">Loading {selectedCountry.name} archived records...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            No archived records found for {selectedCountry.name}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((art) => (
              <FeedCard key={art.id} article={art} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
