'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import HolidayBanner from '@/components/feed/HolidayBanner';
import FeedCard from '@/components/feed/FeedCard';
import FeedAdCard from '@/components/feed/FeedAdCard';
import { ALL_COUNTRIES, CountryConfig, getCountryByCode } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData } from '@/lib/news';
import { createClient } from '@/lib/supabase/client';
import { Newspaper, Lock, ArrowRight, Sparkles, PenTool } from 'lucide-react';
import Link from 'next/link';

export default function CountryFeedPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const countrySlug = (params?.countrySlug as string || 'nigeria').toLowerCase();

  const initialCountry = ALL_COUNTRIES.find((c) => {
    const nameSlug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return nameSlug === countrySlug || c.code.toLowerCase() === countrySlug;
  }) || getCountryByCode('US');

  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(initialCountry);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialCountry.languages[0]?.code || 'en');
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Sync state if countrySlug URL param changes dynamically
  useEffect(() => {
    const matched = ALL_COUNTRIES.find((c) => {
      const nameSlug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return nameSlug === countrySlug || c.code.toLowerCase() === countrySlug;
    }) || getCountryByCode('US');

    setSelectedCountry(matched);
    const defaultLang = matched.languages[0]?.code || 'en';
    setSelectedLanguage(defaultLang);
  }, [countrySlug]);

  // Check auth status for guest vs member rules
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setUser(data.session.user);
      }
    }
    checkAuth();
  }, [supabase]);

  // Fetch articles when country or language changes
  useEffect(() => {
    async function loadNews() {
      setLoading(true);
      const data = await fetchArticlesForCountry(selectedCountry.code, selectedLanguage);
      setArticles(data);
      setLoading(false);
    }
    if (selectedCountry) {
      loadNews();
    }
  }, [selectedCountry, selectedLanguage]);

  const handleCountryChange = (c: CountryConfig) => {
    const nameSlug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    router.push(`/${nameSlug}`);
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    localStorage.setItem('voxpolis_preferred_language', lang);
  };

  const activeArticles = articles.filter((a) => !a.is_archived);
  const archivedCount = articles.length - activeArticles.length;

  const [currentPage, setCurrentPage] = useState(1);
  const ARTICLES_PER_PAGE = 12;

  const totalPages = Math.ceil(activeArticles.length / ARTICLES_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const currentArticles = activeArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

  const firstHalf = currentArticles.slice(0, 6);
  const secondHalf = currentArticles.slice(6, 12);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
      <Header
        user={user ? { id: user.id, email: user.email, fullName: user.user_metadata?.full_name } : null}
        selectedCountry={selectedCountry}
        onSelectCountry={handleCountryChange}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleLanguageChange}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Country & Holiday Greeting Banner */}
        <HolidayBanner countryCode={selectedCountry.code} />

        {/* Guest Access Prompt Banner if user is not logged in */}
        {!user && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-950/60 to-slate-900 border border-blue-500/30 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-bold text-xs sm:text-sm text-blue-200">
                  Viewing {selectedCountry.flag} {selectedCountry.name} Political Feed
                </div>
                <div className="text-[11px] text-gray-300">
                  Members get unlimited access to political feeds for all 230+ countries.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/login"
                className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs rounded-xl transition"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1"
              >
                <span>Sign Up Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Feed Header */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
              {selectedCountry.flag} {selectedCountry.name} | Politics
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2.5 py-1 rounded-full">
              {activeArticles.length} Active Reports
            </span>
          </div>
        </div>

        {/* Write on Country Politics Callout Banner */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Write on {selectedCountry.name} Politics & Policy</h3>
              <p className="text-xs text-gray-300">
                Are you a political analyst or local writer? Submit original op-eds and columns covering {selectedCountry.name}.
              </p>
            </div>
          </div>
          <Link
            href={`/columnist/submit?country=${selectedCountry.code}`}
            className="shrink-0 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <span>Submit Op-Ed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* News Feed Grid with 12 articles per page & Ad placed after 6 articles */}
        {loading ? (
          <div className="space-y-4 py-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500">Loading {selectedCountry.name} political coverage...</p>
          </div>
        ) : activeArticles.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            No active political updates published in the last 30 days.
            <div className="mt-4">
              <Link
                href={`/${countrySlug}/archive`}
                className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow"
              >
                <span>Browse {selectedCountry.name} Historical Archive</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* First 6 Articles Grid (2-Column 2x2 Layout) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {firstHalf.map((art) => (
                <FeedCard key={art.id} article={art} />
              ))}
            </div>

            {/* Advert Space After 6 Articles */}
            {currentArticles.length > 0 && (
              <div className="w-full">
                <FeedAdCard countryCode={selectedCountry.code} countryName={selectedCountry.name} />
              </div>
            )}

            {/* Remaining Articles Grid (2-Column 2x2 Layout) */}
            {secondHalf.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secondHalf.map((art) => (
                  <FeedCard key={art.id} article={art} />
                ))}
              </div>
            )}

            {/* Pagination Navigation & Archive Banner */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-4">
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-40 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    ← Previous Page
                  </button>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-blue-600 text-white disabled:opacity-40 text-xs font-bold rounded-xl hover:bg-blue-700 shadow transition"
                  >
                    Next Page →
                  </button>
                </div>
              )}

              {/* Link to Historical Archive Page */}
              <div className="p-4 rounded-xl bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 text-xs">
                <div className="text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">Historical Archive: </span>
                  Browse earlier historical reports for {selectedCountry.name}.
                </div>
                <Link
                  href={`/${countrySlug}/archive`}
                  className="shrink-0 text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                >
                  <span>View Archive</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
