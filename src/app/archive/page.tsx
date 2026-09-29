'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import FeedCard from '@/components/feed/FeedCard';
import { ALL_COUNTRIES, CountryConfig } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData } from '@/lib/news';
import { Archive, ArrowRight, Calendar, Filter } from 'lucide-react';
import Link from 'next/link';

export default function GlobalArchivePage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(ALL_COUNTRIES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArchivedNews() {
      setLoading(true);
      const data = await fetchArticlesForCountry(selectedCountry.code, selectedLanguage);
      // Filter for archived articles or all articles older than 30 days
      const archived = data.filter((a) => a.is_archived);
      setArticles(archived.length > 0 ? archived : data);
      setLoading(false);
    }
    loadArchivedNews();
  }, [selectedCountry, selectedLanguage]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
      <Header
        selectedCountry={selectedCountry}
        onSelectCountry={setSelectedCountry}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Archive Banner Header */}
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-xl border border-blue-800/40">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Voxpolis Global Political Archive
              </h1>
              <p className="text-xs text-gray-300">
                Permanent historical archives for political intelligence across 230+ nations.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Articles older than 30 days are preserved here permanently for civic research, search indexing, and citation.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-800 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {selectedCountry.flag} {selectedCountry.name} Archive Records ({articles.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Select Country:</span>
            <select
              value={selectedCountry.code}
              onChange={(e) => {
                const found = ALL_COUNTRIES.find((c) => c.code === e.target.value);
                if (found) setSelectedCountry(found);
              }}
              className="text-xs font-semibold p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            >
              {ALL_COUNTRIES.slice(0, 50).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Archive Feed Grid */}
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500">Retrieving archive records...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            No archived records found for {selectedCountry.name}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((art) => (
              <div key={art.id} className="relative">
                <FeedCard article={art} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
