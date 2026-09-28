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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
      <Header
        selectedCountry={selectedCountry}
        onSelectCountry={handleCountryChange}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleLanguageChange}
      />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
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
              {articles.length} Articles
            </span>
          </div>
        </div>

        {/* News Feed Items with Ad Insertion */}
        {loading ? (
          <div className="space-y-4 py-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-500">Fetching localized political coverage ({selectedLanguage.toUpperCase()})...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {articles.map((art, idx) => (
              <div key={art.id}>
                <FeedCard article={art} />

                {/* AD BANNER BETWEEN FEED CARDS */}
                {(idx + 1) % 2 === 0 && <FeedAdCard />}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
