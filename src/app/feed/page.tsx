'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import HolidayBanner from '@/components/feed/HolidayBanner';
import FeedCard from '@/components/feed/FeedCard';
import FeedAdCard from '@/components/feed/FeedAdCard';
import { SUPPORTED_COUNTRIES, CountryConfig, getCountryByCode } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData } from '@/lib/news';
import { Newspaper } from 'lucide-react';

export default function FeedPage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(SUPPORTED_COUNTRIES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load saved country & language from onboarding or localStorage
  useEffect(() => {
    const savedCountry = localStorage.getItem('voxpolis_primary_country');
    const savedLang = localStorage.getItem('voxpolis_preferred_language');

    if (savedCountry) {
      const c = getCountryByCode(savedCountry);
      setSelectedCountry(c);
      if (savedLang) {
        setSelectedLanguage(savedLang);
      } else if (c.languages.length > 0) {
        setSelectedLanguage(c.languages[0].code);
      }
    }
  }, []);

  // Fetch news articles when country or language changes
  useEffect(() => {
    async function loadNews() {
      setLoading(true);
      const data = await fetchArticlesForCountry(selectedCountry.code, selectedLanguage);
      setArticles(data);
      setLoading(false);
    }
    loadNews();
  }, [selectedCountry, selectedLanguage]);

  const handleCountryChange = (c: CountryConfig) => {
    setSelectedCountry(c);
    const defaultLang = c.languages[0]?.code || 'en';
    setSelectedLanguage(defaultLang);
    localStorage.setItem('voxpolis_primary_country', c.code);
    localStorage.setItem('voxpolis_preferred_language', defaultLang);
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    localStorage.setItem('voxpolis_preferred_language', lang);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const ARTICLES_PER_PAGE = 12;

  const activeArticles = articles.filter((a) => !a.is_archived);
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
        selectedCountry={selectedCountry}
        onSelectCountry={handleCountryChange}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleLanguageChange}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Country & Holiday Greeting Banner */}
        <HolidayBanner countryCode={selectedCountry.code} />

        {/* Feed Header */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
              {selectedCountry.flag} {selectedCountry.name} Political Intelligence
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              Language: {selectedLanguage.toUpperCase()}
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2.5 py-1 rounded-full">
              {activeArticles.length} Active Reports
            </span>
          </div>
        </div>

        {/* News Feed Items in 2-Column Grid with 12 Articles Per Page */}
        {loading ? (
          <div className="space-y-4 py-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500">Fetching localized political coverage ({selectedLanguage.toUpperCase()})...</p>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
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
          </div>
        )}
      </main>
    </div>
  );
}
