'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';
import FeedCard from '@/components/feed/FeedCard';
import Footer from '@/components/layout/Footer';
import RegionalCountrySelectorModal from '@/components/layout/RegionalCountrySelectorModal';
import AuthPromptModal from '@/components/auth/AuthPromptModal';
import { createClient } from '@/lib/supabase/client';
import { ALL_COUNTRIES, CountryConfig, getCountryByCode } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData, formatExactTimestamp, getArticleImageUrl } from '@/lib/news';
import {
  Globe2,
  Flame,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserCheck,
  ChevronDown,
  ArrowRight,
  Newspaper,
  PenTool,
} from 'lucide-react';

export default function LandingPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(getCountryByCode('US'));
  const [isAutoDetected, setIsAutoDetected] = useState(true);
  const [allArticles, setAllArticles] = useState<ArticleData[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setUser(data.session.user);
      }
    }
    checkUser();
  }, [supabase]);

  useEffect(() => {
    async function detectLocationAndLoadNews() {
      setLoadingArticles(true);
      let countryCode = 'US';

      const savedCountry = typeof window !== 'undefined' ? localStorage.getItem('voxpolis_primary_country') : null;

      if (savedCountry) {
        countryCode = savedCountry;
        setIsAutoDetected(false);
      } else {
        try {
          const res = await fetch('https://ipapi.co/json/');
          if (res.ok) {
            const data = await res.json();
            if (data.country_code) {
              countryCode = data.country_code;
            }
          }
        } catch {
          try {
            const res2 = await fetch('https://ip-api.com/json/');
            if (res2.ok) {
              const data2 = await res2.json();
              if (data2.countryCode) {
                countryCode = data2.countryCode;
              }
            }
          } catch {
            countryCode = 'US';
          }
        }
      }

      const matchedCountry = getCountryByCode(countryCode);
      setSelectedCountry(matchedCountry);

      const newsData = await fetchArticlesForCountry(matchedCountry.code);
      setAllArticles(newsData);
      setLoadingArticles(false);
    }

    detectLocationAndLoadNews();
  }, []);

  const handleSelectCountry = async (c: CountryConfig) => {
    setSelectedCountry(c);
    setIsAutoDetected(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('voxpolis_primary_country', c.code);
    }
    setLoadingArticles(true);
    const data = await fetchArticlesForCountry(c.code);
    setAllArticles(data);
    setLoadingArticles(false);
    setCurrentSlideIndex(0);
  };

  const topSlides = allArticles.slice(0, 5);
  const gridArticles = allArticles.slice(5);

  const handleNextSlide = () => {
    if (topSlides.length > 0) {
      setCurrentSlideIndex((prev) => (prev + 1) % topSlides.length);
    }
  };

  const handlePrevSlide = () => {
    if (topSlides.length > 0) {
      setCurrentSlideIndex((prev) => (prev - 1 + topSlides.length) % topSlides.length);
    }
  };

  const activeSlide = topSlides[currentSlideIndex] || topSlides[0];
  const countrySlug = selectedCountry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/90 border-b border-gray-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <SiteLogo variant="full" className="h-8 sm:h-9 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/news"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  <Newspaper className="w-4 h-4" />
                  <span>Verified News</span>
                </Link>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-full">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Logged In</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs font-bold text-gray-300 hover:text-white px-3 py-2 transition"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl shadow-md transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Homepage Feed */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-10">
        {/* Country Selector Sub-Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-extrabold text-white">
              {isAutoDetected ? 'Live Detected Region:' : 'Selected Country:'}
            </span>
            <button
              onClick={() => {
                if (!user) {
                  setIsAuthPromptOpen(true);
                } else {
                  setIsCountryModalOpen(true);
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-700 text-white font-bold text-xs hover:border-blue-500 transition cursor-pointer"
            >
              <span className="text-base">{selectedCountry.flag}</span>
              <span>{selectedCountry.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-gray-400">
            <span>5 Top Trending Stories</span>
            <span>•</span>
            <Link href="/about" className="text-blue-400 hover:underline">
              About Voxpolis Coverage →
            </Link>
          </div>
        </div>

        {/* 5-Slide Featured Trending Carousel */}
        {loadingArticles ? (
          <div className="w-full h-80 rounded-3xl bg-gray-900 animate-pulse flex items-center justify-center text-gray-500 text-xs font-semibold">
            Loading trending country news...
          </div>
        ) : activeSlide ? (
          <section className="relative rounded-3xl overflow-hidden border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="relative h-[420px] sm:h-[480px] w-full">
              {/* eslint-disable-next-html-element-suppression */}
              <img
                src={getArticleImageUrl(activeSlide)}
                alt={activeSlide.title}
                className="w-full h-full object-cover filter brightness-50"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-6 sm:p-10 flex flex-col justify-end space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-red-600 text-white font-extrabold text-[10px] rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Flame className="w-3 h-3" />
                    <span>Top Trending • {selectedCountry.name}</span>
                  </span>
                  <span className="text-xs font-semibold text-gray-300">
                    Slide {currentSlideIndex + 1} of {topSlides.length}
                  </span>
                </div>

                <Link
                  href={`/news/${activeSlide.slug}`}
                  className="group hover:opacity-95 transition"
                >
                  <h2 className="text-xl sm:text-3xl font-black text-white leading-tight max-w-4xl group-hover:text-blue-300 transition">
                    {activeSlide.title}
                  </h2>
                </Link>

                <p className="text-xs sm:text-sm text-gray-300 max-w-3xl line-clamp-2 leading-relaxed">
                  {activeSlide.snippet}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800/80">
                  <div className="flex items-center gap-3">
                    <span>Source: <strong className="text-white">{activeSlide.source_name}</strong></span>
                    {activeSlide.created_at && (
                      <span className="hidden sm:inline">• {formatExactTimestamp(activeSlide.created_at)}</span>
                    )}
                  </div>
                  <Link
                    href={`/news/${activeSlide.slug}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1"
                  >
                    <span>Read Full Brief</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Carousel Next/Prev Controls */}
              {topSlides.length > 1 && (
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    onClick={handlePrevSlide}
                    className="p-2.5 rounded-full bg-slate-950/80 border border-gray-700 text-white hover:bg-blue-600 transition cursor-pointer"
                    title="Previous Slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextSlide}
                    className="p-2.5 rounded-full bg-slate-950/80 border border-gray-700 text-white hover:bg-blue-600 transition cursor-pointer"
                    title="Next Slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Write on Country Politics Callout Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Write on {selectedCountry.name} Politics & Policy</h3>
              <p className="text-xs text-gray-300">
                Share in-depth analysis and editorial columns on {selectedCountry.name}’s political landscape with our civic readership.
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

        {/* Primary Country Feed Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>{selectedCountry.flag}</span>
                <span>{selectedCountry.name} News Feed</span>
              </h2>
              <p className="text-xs text-gray-400">
                Live, continuous political coverage and policy updates for {selectedCountry.name}.
              </p>
            </div>

            <Link
              href={`/${countrySlug}`}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>View Full Feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingArticles ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-gray-900 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(gridArticles.length > 0 ? gridArticles : allArticles).slice(0, 6).map((art) => (
                  <FeedCard key={art.id} article={art} />
                ))}
              </div>

              <div className="text-center pt-4">
                <Link
                  href="/news"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-2xl shadow-xl transition transform hover:scale-105"
                >
                  <span>Read More News</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* Regional Country Selector Modal */}
      <RegionalCountrySelectorModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        selectedCountry={selectedCountry}
        onSelectCountry={handleSelectCountry}
      />

      {/* Auth Prompt Modal for Guests */}
      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
      />
    </div>
  );
}
