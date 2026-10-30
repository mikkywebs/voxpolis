'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BentoHeader from './BentoHeader';
import BreakingTicker from './BreakingTicker';
import LeftWidgetRail from './LeftWidgetRail';
import HeroPopularitySlider from './HeroPopularitySlider';
import StoryCard from './StoryCard';
import Footer from '@/components/layout/Footer';
import RegionalCountrySelectorModal from '@/components/layout/RegionalCountrySelectorModal';
import { CountryConfig, getCountrySlug } from '@/config/countries';
import { ArticleData } from '@/lib/news';
import { Newspaper, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface BentoFeedLayoutProps {
  selectedCountry: CountryConfig;
  articles: ArticleData[];
  loading?: boolean;
  user?: {
    id: string;
    email?: string;
    fullName?: string;
  } | null;
  onSelectCountry?: (country: CountryConfig) => void;
  // Followed feeds for logged in users or guest exploration
  secondaryFeeds?: Array<{ country: CountryConfig; articles: ArticleData[] }>;
  // SEO: visible page heading + intro (rendered on the server)
  heading?: string;
  intro?: string;
  secondaryTitle?: string;
}

export default function BentoFeedLayout({
  selectedCountry,
  articles,
  loading = false,
  user,
  onSelectCountry,
  secondaryFeeds = [],
  heading,
  intro,
  secondaryTitle,
}: BentoFeedLayoutProps) {
  const router = useRouter();
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const handleCountryChange = (c: CountryConfig) => {
    setIsCountryModalOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('voxpolis_primary_country', c.code);
      if (c.languages?.length > 0) {
        localStorage.setItem('voxpolis_preferred_language', c.languages[0].code);
      }
    }
    if (onSelectCountry) {
      onSelectCountry(c);
    }
    const slug = getCountrySlug(c);
    router.push(`/${slug}`);
  };

  // Distinct slots for Bento layout:
  // Row 1: Hero Slider (2 cols, uses articles 0-4) + Adjacent Card (1 col, uses article 5 or 1)
  const adjacentStory = articles[5] || articles[1] || articles[0];

  // Grid below Row 1: Definite limit with clean pagination (6 cards per page, max 10 pages)
  const CARDS_PER_PAGE = 6;
  const MAX_PAGES = 10;
  const feedPool = articles.length > 6 ? articles.slice(6) : (articles.length > 2 ? articles.slice(2) : articles);
  const totalPages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(feedPool.length / CARDS_PER_PAGE)));
  const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
  const currentGridCards = feedPool.slice(startIndex, startIndex + CARDS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  };

  const secondaryBlock = secondaryFeeds.length > 0 && (
                <div className="pt-8 mt-8 border-t border-gray-200 dark:border-neutral-800 space-y-8">
                  {secondaryTitle && (
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">{secondaryTitle}</h2>
                  )}
                  {secondaryFeeds.map((feed) => (
                    <div key={feed.country.code} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{feed.country.flag}</span>
                          <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {feed.country.name}
                          </h4>
                        </div>
                        <Link
                          href={`/${getCountrySlug(feed.country)}`}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View all in {feed.country.name} →
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {feed.articles.slice(0, 3).map((art, idx) => (
                          <StoryCard
                            key={art.id || art.slug || idx}
                            article={art}
                            index={idx}
                            countryCode={feed.country.code}
                            variant="standard"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
      {/* 1. Header Bar with Greeting, Country Selector Trigger, Centered Logo & Theme Toggle */}
      <BentoHeader
        user={user}
        selectedCountry={selectedCountry}
        onOpenCountryModal={() => setIsCountryModalOpen(true)}
      />

      {/* 2. Breaking News Ticker Bar */}
      <BreakingTicker articles={articles} countryCode={selectedCountry.code} />

      {/* 3. Main Bento Feed Area */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {heading && (
          <div className="mb-5">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{heading}</h1>
            {intro && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-3xl">{intro}</p>}
          </div>
        )}
        {!loading && articles.length === 0 ? (
          <div className="w-full rounded-3xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-10 text-center space-y-3">
            <Newspaper className="w-10 h-10 text-gray-400 mx-auto" />
            <p className="text-base font-bold text-gray-800 dark:text-gray-200">
              Our {selectedCountry.name} desk has no new stories yet.
            </p>
            <p className="text-sm text-gray-500">
              {secondaryFeeds.length > 0
                ? 'New reports are added through the day. Meanwhile, here is what is happening elsewhere.'
                : 'New stories are on the way. Please check back soon.'}
            </p>
          </div>
        ) : null}
        {!loading && articles.length === 0 ? (
          secondaryBlock
        ) : loading ? (
          <div className="w-full h-96 rounded-3xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 flex flex-col items-center justify-center gap-4">
            <img
              src="/voxpolis-loader-logo.png"
              alt="Voxpolis"
              className="w-16 h-16 object-contain animate-pulse"
            />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-start gap-6 relative">
            {/* Desktop Left Rail (~280px-300px): STATIC / STICKY in view even when scrolling */}
            <div className="hidden lg:block shrink-0 sticky top-20 self-start w-[280px] xl:w-[300px]">
              <LeftWidgetRail country={selectedCountry} trendingArticles={articles} />
            </div>

            {/* Main Bento Feed Grid */}
            <div className="flex-1 space-y-6 min-w-0">
              {/* Row 1: Hero Popularity Slider (2 cols) + Adjacent Story Card (1 col) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <HeroPopularitySlider
                  articles={articles}
                  countryCode={selectedCountry.code}
                />

                {adjacentStory && (
                  <StoryCard
                    article={adjacentStory}
                    index={5}
                    countryCode={selectedCountry.code}
                    variant="adjacent"
                  />
                )}
              </div>

              {/* Mobile Interleaved Strip: Weather + Civic Poll rendered right after Hero Slider on mobile */}
              <LeftWidgetRail country={selectedCountry} trendingArticles={articles} variant="mobile_strip" />

              {/* Verified National Reports (6 Cards Per Page with No Endless Scrolling) */}
              {currentGridCards.length > 0 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-neutral-800">
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                      <Newspaper className="w-4 h-4 text-blue-500" />
                      <span>National News · {selectedCountry.name}</span>
                    </h3>
                    <span className="text-xs text-gray-400 font-semibold">
                      Showing {startIndex + 1}–{Math.min(startIndex + CARDS_PER_PAGE, feedPool.length)} of {feedPool.length}
                    </span>
                  </div>

                  {/* Uniform 3-Column Photo Cards Grid (No empty spaces, no snippet text under title) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {currentGridCards.map((art, idx) => (
                      <StoryCard
                        key={art.id || art.slug || idx}
                        article={art}
                        index={startIndex + idx + 6}
                        countryCode={selectedCountry.code}
                        variant="standard"
                      />
                    ))}
                  </div>

                  {/* Definite Pagination Controls: Prev, Next, and Page Numbers */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                          currentPage === 1
                            ? 'opacity-40 cursor-not-allowed text-gray-400 bg-gray-100 dark:bg-neutral-900'
                            : 'bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 shadow-xs'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                          const pageNum = idx + 1;
                          const isActive = pageNum === currentPage;
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-8 h-8 rounded-xl font-bold transition flex items-center justify-center ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                          currentPage === totalPages
                            ? 'opacity-40 cursor-not-allowed text-gray-400 bg-gray-100 dark:bg-neutral-900'
                            : 'bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 shadow-xs'
                        }`}
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}


              {secondaryBlock}
            </div>
          </div>
        )}
      </main>

      {/* Regional Country Selector Modal */}
      <RegionalCountrySelectorModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        selectedCountry={selectedCountry}
        onSelectCountry={handleCountryChange}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
