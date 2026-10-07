'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FeedCard from '@/components/feed/FeedCard';
import { SUPPORTED_COUNTRIES, CountryConfig, getCountryByCode, getCountrySlug } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData } from '@/lib/news';
import { Search, SearchX, ArrowRight, Compass, Newspaper } from 'lucide-react';
import Link from 'next/link';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(rawQuery);
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(SUPPORTED_COUNTRIES[0]);
  const [results, setResults] = useState<ArticleData[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);

  // Restore country preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem('voxpolis_country_preference');
      if (stored) {
        const found = SUPPORTED_COUNTRIES.find((c) => c.code === stored || getCountrySlug(c) === stored);
        if (found) setSelectedCountry(found);
      }
    } catch {}
  }, []);

  // Sync state when query parameter updates
  useEffect(() => {
    setQuery(rawQuery);
  }, [rawQuery]);

  useEffect(() => {
    async function executeSearch() {
      setLoading(true);
      try {
        const articles = await fetchArticlesForCountry(selectedCountry.code);
        setTrendingArticles(articles.slice(0, 6));

        if (rawQuery.trim()) {
          const lower = rawQuery.toLowerCase().trim();
          const matched = articles.filter((a) => {
            const inTitle = a.title.toLowerCase().includes(lower);
            const inSnippet = a.snippet.toLowerCase().includes(lower);
            const inCategory = (a.category || '').toLowerCase().includes(lower);
            const inTags = a.tags ? a.tags.some((t) => t.toLowerCase().includes(lower)) : false;
            return inTitle || inSnippet || inCategory || inTags;
          });
          setResults(matched);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error(err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    executeSearch();
  }, [rawQuery, selectedCountry.code]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 flex flex-col justify-between">
      {/* SEO protection for dynamic search queries */}
      <head>
        <meta name="robots" content="noindex, follow" />
        <title>
          {rawQuery ? `Search: "${rawQuery}" | Voxpolis` : 'Search Political News | Voxpolis'}
        </title>
      </head>

      <Header selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Search Header & Bar */}
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Search Political News
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Search live policy briefs, executive orders, parliamentary records, and breaking news.
          </p>

          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keywords, politician, policy, or institution..."
              className="w-full text-xs sm:text-sm p-3.5 pl-11 pr-24 rounded-2xl border border-gray-300 dark:border-gray-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-4" />
            <button
              type="submit"
              className="absolute right-2 top-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow"
            >
              Search
            </button>
          </form>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-400">Scanning news feeds...</p>
          </div>
        )}

        {/* Results Found */}
        {!loading && rawQuery.trim() && results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Found {results.length} report{results.length > 1 ? 's' : ''} for &quot;{rawQuery}&quot;
              </span>
              <span className="text-xs text-gray-400">
                {selectedCountry.flag} {selectedCountry.name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((art) => (
                    <FeedCard key={art.id} article={art} />
              ))}
            </div>
          </div>
        )}

        {/* Zero Results State */}
        {!loading && rawQuery.trim() && results.length === 0 && (
          <div className="py-10 space-y-8">
            <div className="max-w-md mx-auto text-center p-8 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <SearchX className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                No matching reports found for &quot;{rawQuery}&quot;
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                We couldn&apos;t find any stories matching your exact query in current feeds. You can explore today&apos;s headlines from your country below.
              </p>
              <div className="pt-2">
                <Link
                  href={`/${getCountrySlug(selectedCountry)}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  <span>Explore {selectedCountry.name} News Desk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Recommended Country Feed */}
            {trendingArticles.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Trending in {selectedCountry.name} ({selectedCountry.flag})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingArticles.map((art) => (
                        <FeedCard key={art.id} article={art} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
