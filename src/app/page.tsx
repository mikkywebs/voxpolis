'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';
import FeedCard from '@/components/feed/FeedCard';
import RegionalCountrySelectorModal from '@/components/layout/RegionalCountrySelectorModal';
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
} from 'lucide-react';

export default function LandingPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  // IP-detected location & preview feed articles
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(getCountryByCode('US'));
  const [isAutoDetected, setIsAutoDetected] = useState(true);
  const [allArticles, setAllArticles] = useState<ArticleData[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  // Check auth without forcing redirect so logged in users can view homepage
  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setUser(data.session.user);
      }
    }
    checkUser();
  }, [supabase]);

  // Robust Multi-Provider IP Geolocation Detection & News Loading
  useEffect(() => {
    async function detectLocationAndLoadNews() {
      setLoadingArticles(true);
      let countryCode = 'US';

      const savedCountry = typeof window !== 'undefined' ? localStorage.getItem('voxpolis_primary_country') : null;

      if (savedCountry) {
        countryCode = savedCountry;
        setIsAutoDetected(false);
      } else {
        // Provider 1: ipapi.co
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data.country_code && typeof data.country_code === 'string' && data.country_code.length === 2) {
              countryCode = data.country_code;
            }
          }
        } catch {
          // Provider 2: ip-api.com fallback
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            const res = await fetch('http://ip-api.com/json/?fields=countryCode', { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              if (data.countryCode && typeof data.countryCode === 'string' && data.countryCode.length === 2) {
                countryCode = data.countryCode;
              }
            }
          } catch {
            countryCode = 'US';
          }
        }
      }

      const country = getCountryByCode(countryCode);
      setSelectedCountry(country);
      loadCountryNews(country.code);
    }

    detectLocationAndLoadNews();
  }, []);

  // Helper to fetch news when country changes
  const loadCountryNews = async (code: string) => {
    setLoadingArticles(true);
    setCurrentSlideIndex(0);
    try {
      const articles = await fetchArticlesForCountry(code);
      setAllArticles(articles);
    } catch (e) {
      console.warn('Failed to load articles:', e);
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleSelectCountry = (country: CountryConfig) => {
    setSelectedCountry(country);
    setIsAutoDetected(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('voxpolis_primary_country', country.code);
    }
    loadCountryNews(country.code);
  };

  // Top 5 articles for Featured Slider Hero (increased to 5 slides)
  const featuredArticles = allArticles.slice(0, 5);
  // Grid section takes remaining articles (max 12) so featured items are NOT duplicated
  const gridArticles = allArticles.slice(5, 17);

  // Auto-play featured carousel slider every 6 seconds across top 5 slides
  useEffect(() => {
    if (featuredArticles.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % featuredArticles.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredArticles.length]);

  const activeSlide = featuredArticles[currentSlideIndex] || featuredArticles[0];
  const countrySlug = selectedCountry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-600 selection:text-white flex flex-col">
      {/* Slim Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 w-full flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <SiteLogo variant="light" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            {/* Country Selector Trigger */}
            <button
              onClick={() => setIsCountryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs font-bold text-white transition shadow-sm"
              title="Change Country Feed"
            >
              <span className="text-base">{selectedCountry.flag}</span>
              <span className="hidden sm:inline">{selectedCountry.name}</span>
              <span className="sm:hidden font-mono">{selectedCountry.code}</span>
              <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
            </button>

            <Link href="/about" className="text-xs font-semibold text-gray-300 hover:text-white transition hidden md:inline">
              About Us
            </Link>

            {user ? (
              <Link
                href="/feed"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>My Feed</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white transition"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: Live News Feed as Primary Focus */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Country Feed Title Strip & Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800/80">
          <div className="flex items-center gap-2.5">
            <Flame className="w-6 h-6 text-amber-400 animate-pulse shrink-0" />
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              {selectedCountry.flag} {selectedCountry.name} | Politics
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/70 border border-blue-800/60 text-blue-300 text-xs font-bold">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>{isAutoDetected ? `Auto-Detected (${selectedCountry.code})` : `Selected (${selectedCountry.code})`}</span>
            </span>

            <button
              onClick={() => setIsCountryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-bold transition"
            >
              <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Change Country</span>
            </button>
          </div>
        </div>

        {/* FEATURED NEWS CAROUSEL SLIDER (Top 5 Trending Stories, Increased Height: h-96 sm:h-[480px]) */}
        <section className="w-full text-left">
          {loadingArticles ? (
            /* Skeleton Placeholder matching Carousel dimensions (CLS Prevention) */
            <div className="h-96 sm:h-[480px] w-full rounded-3xl bg-gray-900/80 border border-gray-800 animate-pulse p-6 sm:p-10 flex flex-col justify-end space-y-4">
              <div className="h-6 bg-gray-800 rounded w-1/4" />
              <div className="h-10 bg-gray-800 rounded w-4/5" />
              <div className="h-12 bg-gray-800/60 rounded w-full" />
            </div>
          ) : featuredArticles.length > 0 && activeSlide ? (
            <div className="relative rounded-3xl overflow-hidden border border-gray-800 bg-gray-900 shadow-2xl group">
              {/* Featured Background Image with taller aspect ratio (h-96 sm:h-[480px]) */}
              <div className="relative h-96 sm:h-[480px] w-full overflow-hidden bg-slate-950">
                {/* eslint-disable-next-html-element-suppression */}
                <img
                  src={getArticleImageUrl(activeSlide)}
                  alt={activeSlide.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/breaking-news-banner.png';
                  }}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/20" />
              </div>

              {/* Slider Content Overlay */}
              <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 flex flex-col justify-end space-y-3 z-10">
                <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-red-600 text-white font-extrabold text-[11px] rounded-full uppercase tracking-wider shadow">
                      FEATURED REPORT ({currentSlideIndex + 1}/{featuredArticles.length})
                    </span>
                    <span className="font-bold text-blue-300 uppercase tracking-wide">
                      {activeSlide.source_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-gray-300 text-[11px] font-medium">
                    <span className="flex items-center gap-1 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-full border border-gray-700">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span>{(activeSlide.views_count || 1240).toLocaleString()} views</span>
                    </span>
                    <span className="bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-full border border-gray-700">
                      {formatExactTimestamp(activeSlide.created_at)}
                    </span>
                  </div>
                </div>

                <Link href={`/article/${activeSlide.slug}`} className="block group-hover:text-blue-300 transition">
                  <h2 className="text-2xl sm:text-4xl font-black text-white leading-snug drop-shadow-md">
                    {activeSlide.title}
                  </h2>
                </Link>

                <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 max-w-4xl leading-relaxed">
                  {activeSlide.snippet}
                </p>

                {/* Slider Controls & Progress Bar for 5 Slides */}
                <div className="pt-3 flex items-center justify-between">
                  {/* Slide Indicators */}
                  <div className="flex items-center gap-2">
                    {featuredArticles.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          currentSlideIndex === idx ? 'w-10 bg-blue-500' : 'w-2.5 bg-gray-600 hover:bg-gray-400'
                        }`}
                        title={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Previous / Next Arrows */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentSlideIndex(
                          (prev) => (prev - 1 + featuredArticles.length) % featuredArticles.length
                        )
                      }
                      className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-gray-700 transition"
                      title="Previous Slide"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentSlideIndex((prev) => (prev + 1) % featuredArticles.length)
                      }
                      className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-gray-700 transition"
                      title="Next Slide"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* Dynamic Country Political Feed Cards Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-400" />
              <span>Latest {selectedCountry.name} Political Updates</span>
            </h2>
            <span className="text-xs text-gray-400 font-semibold">
              {allArticles.length} Verified Reports
            </span>
          </div>

          {loadingArticles ? (
            /* Skeleton Loading State */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-6 rounded-2xl bg-gray-900/60 border border-gray-800 animate-pulse space-y-3">
                  <div className="h-4 bg-gray-800 rounded w-1/3" />
                  <div className="h-6 bg-gray-800 rounded w-5/6" />
                  <div className="h-12 bg-gray-800/50 rounded w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(gridArticles.length > 0 ? gridArticles : allArticles).map((art) => (
                  <FeedCard key={art.id} article={art} />
                ))}
              </div>

              {/* View Full Country Feed Button */}
              <div className="text-center pt-4">
                <Link
                  href={`/${countrySlug}`}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-2xl shadow-xl transition transform hover:scale-105"
                >
                  <span>Explore Full {selectedCountry.flag} {selectedCountry.name} Feed</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Regional Country Selector Modal */}
      <RegionalCountrySelectorModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        selectedCountry={selectedCountry}
        onSelectCountry={handleSelectCountry}
      />
    </div>
  );
}
