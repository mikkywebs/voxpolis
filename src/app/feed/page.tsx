'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
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

  const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);

  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const currentArticles = articles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

  const firstHalf = currentArticles.slice(0, 4);
  const secondHalf = currentArticles.slice(4);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <HolidayBanner countryCode={selectedCountry.code} />

        {/* Section Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">{selectedCountry.flag}</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span>{selectedCountry.name} Political Feed</span>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-bold">
                  {selectedLanguage.toUpperCase()}
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Verified regional political updates, policy briefs, and civic sentiment polls.
              </p>
            </div>
          </div>
        </div>

        {/* Feed Cards List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse border border-gray-300 dark:border-gray-700"
              />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800">
            <Newspaper className="w-10 h-10 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
              No Political Updates Available
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              There are currently no fresh political reports matching {selectedCountry.name} in {selectedLanguage.toUpperCase()}.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {firstHalf.map((art) => (
                <FeedCard key={art.id} article={art} />
              ))}
            </div>

            <FeedAdCard countryCode={selectedCountry.code} countryName={selectedCountry.name} />

            {secondHalf.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secondHalf.map((art) => (
                  <FeedCard key={art.id} article={art} />
                ))}
              </div>
            )}

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

      <Footer />
    </div>
  );
}
