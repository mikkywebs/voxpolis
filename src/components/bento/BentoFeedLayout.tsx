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
import { Newspaper, SlidersHorizontal, Loader2 } from 'lucide-react';
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
}

export default function BentoFeedLayout({
  selectedCountry,
  articles,
  loading = false,
  user,
  onSelectCountry,
  secondaryFeeds = [],
}: BentoFeedLayoutProps) {
  const router = useRouter();
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

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

  // Separate feed for Bento layout
  // Slider uses top 5 candidates
  const adjacentStory = articles[5] || articles[1] || articles[0];
  const row2Stories = articles.slice(6, 9);
  const remainingStories = articles.slice(9);

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
        {loading ? (
          <div className="w-full h-96 rounded-3xl bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 animate-pulse flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
            <span className="text-xs font-semibold">
              Loading verified civic intelligence for {selectedCountry.name}...
            </span>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Desktop Left Rail (~280px-300px): Weather & AQI, Ad Card, Real Country Civic Poll */}
            <div className="hidden lg:block shrink-0">
              <LeftWidgetRail country={selectedCountry} />
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
              <LeftWidgetRail country={selectedCountry} variant="mobile_strip" />

              {/* Row 2: Bento Mix (Brief, Native Ad, Standard Story Card) */}
              {row2Stories.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {row2Stories[0] && (
                    <StoryCard
                      article={row2Stories[0]}
                      index={6}
                      countryCode={selectedCountry.code}
                      variant="standard"
                    />
                  )}
                  {row2Stories[1] && (
                    <StoryCard
                      article={row2Stories[1]}
                      index={7}
                      countryCode={selectedCountry.code}
                      variant="brief"
                    />
                  )}
                  {row2Stories[2] ? (
                    <StoryCard
                      article={row2Stories[2]}
                      index={8}
                      countryCode={selectedCountry.code}
                      variant="standard"
                    />
                  ) : (
                    <StoryCard
                      article={row2Stories[0]}
                      countryCode={selectedCountry.code}
                      variant="native_ad"
                    />
                  )}
                </div>
              )}

              {/* Row 3 and Below: Standard Bento Grid Feed with Universal Engagement Bars */}
              {remainingStories.length > 0 && (
                <div>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-neutral-800">
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                      <Newspaper className="w-4 h-4 text-blue-500" />
                      <span>National Newsroom Dispatch · {selectedCountry.name}</span>
                    </h3>
                    <span className="text-xs text-gray-400 font-semibold">
                      {remainingStories.length} verified reports
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {remainingStories.map((art, idx) => (
                      <StoryCard
                        key={art.id || art.slug || idx}
                        article={art}
                        index={9 + idx}
                        countryCode={selectedCountry.code}
                        variant="standard"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary Feeds (e.g. Followed Countries or Global Dispatches) */}
              {secondaryFeeds.length > 0 && (
                <div className="pt-8 mt-8 border-t border-gray-200 dark:border-neutral-800 space-y-8">
                  {secondaryFeeds.map((feed) => (
                    <div key={feed.country.code} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{feed.country.flag}</span>
                          <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {feed.country.name} Intelligence Desk
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
              )}
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
