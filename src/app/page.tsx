'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/branding/SiteLogo';
import FeedCard from '@/components/feed/FeedCard';
import Footer from '@/components/layout/Footer';
import RegionalCountrySelectorModal from '@/components/layout/RegionalCountrySelectorModal';
import AuthPromptModal from '@/components/auth/AuthPromptModal';
import { createClient } from '@/lib/supabase/client';
import { ALL_COUNTRIES, CountryConfig, getCountryByCode, getCountrySlug } from '@/config/countries';
import {
  fetchArticlesForCountry,
  ArticleData,
  formatExactTimestamp,
  getArticleImageUrl,
  getArticleFallbackUrl,
} from '@/lib/news';
import {
  Globe2,
  Flame,
  MapPin,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ChevronDown,
  ArrowRight,
  Newspaper,
  PenTool,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [greeting, setGreeting] = useState<string>('Welcome');

  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(getCountryByCode('NG'));
  const [isAutoDetected, setIsAutoDetected] = useState(true);
  const [allArticles, setAllArticles] = useState<ArticleData[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Registered user multi-country followed feeds
  const [followedCountryFeeds, setFollowedCountryFeeds] = useState<
    Array<{ country: CountryConfig; articles: ArticleData[] }>
  >([]);

  // Guest global reference feeds
  const [guestGlobalFeeds, setGuestGlobalFeeds] = useState<
    Array<{ country: CountryConfig; articles: ArticleData[] }>
  >([]);

  // Modals
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
  }>({ isOpen: false });

  // Time-of-day greeting calculation
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Check Supabase session & user profile
  useEffect(() => {
    let authSub: any = null;

    async function checkAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user;

        const localName = localStorage.getItem('voxpolis_user_name');
        const localEmail = localStorage.getItem('voxpolis_user_email');
        const localCountry = localStorage.getItem('voxpolis_primary_country');
        let localFollowed: string[] = [];
        try {
          const parsed = JSON.parse(localStorage.getItem('voxpolis_followed_countries') || '[]');
          if (Array.isArray(parsed)) localFollowed = parsed;
        } catch {}

        if (sessionUser) {
          const name = sessionUser.user_metadata?.full_name || localName || sessionUser.email?.split('@')[0] || 'Citizen';
          const primary = sessionUser.user_metadata?.primary_country || localCountry || 'NG';
          const followed = sessionUser.user_metadata?.followed_countries || localFollowed;

          setUser({
            id: sessionUser.id,
            email: sessionUser.email,
            fullName: name,
            primaryCountry: primary,
            followedCountries: Array.isArray(followed) ? followed : [],
          });
        } else if (localName || localStorage.getItem('voxpolis_session_active') === 'true') {
          setUser({
            id: 'local-member',
            fullName: localName || 'Citizen',
            email: localEmail || undefined,
            primaryCountry: localCountry || 'NG',
            followedCountries: localFollowed,
          });
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          const u = session?.user;
          if (u) {
            const name = u.user_metadata?.full_name || localStorage.getItem('voxpolis_user_name') || u.email?.split('@')[0] || 'Citizen';
            setUser({
              id: u.id,
              email: u.email,
              fullName: name,
              primaryCountry: u.user_metadata?.primary_country || localStorage.getItem('voxpolis_primary_country') || 'NG',
              followedCountries: u.user_metadata?.followed_countries || [],
            });
          }
        });
        authSub = sub?.subscription;
      } catch {}
    }

    checkAuth();
    return () => {
      if (authSub) authSub.unsubscribe();
    };
  }, [supabase]);

  // Load Primary and Secondary News Feeds
  useEffect(() => {
    async function detectLocationAndLoadNews() {
      setLoadingArticles(true);
      let targetCode = 'NG';

      // If registered member, prioritize their saved primary country
      if (user?.primaryCountry) {
        targetCode = user.primaryCountry;
        setIsAutoDetected(false);
      } else {
        const savedCountry = typeof window !== 'undefined' ? localStorage.getItem('voxpolis_primary_country') : null;
        if (savedCountry) {
          targetCode = savedCountry;
          setIsAutoDetected(false);
        } else {
          // First-time guest: IP Geolocation
          try {
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
              const data = await res.json();
              if (data.country_code) targetCode = data.country_code;
            }
          } catch {
            try {
              const res2 = await fetch('https://ip-api.com/json/');
              if (res2.ok) {
                const data2 = await res2.json();
                if (data2.countryCode) targetCode = data2.countryCode;
              }
            } catch {
              targetCode = 'NG';
            }
          }
        }
      }

      const matchedCountry = getCountryByCode(targetCode);
      setSelectedCountry(matchedCountry);

      // 1. Fetch Primary Country Articles
      const primaryData = await fetchArticlesForCountry(matchedCountry.code);
      setAllArticles(primaryData);
      setLoadingArticles(false);

      // 2. Fetch Secondary Feeds (Registered Followed Countries vs Guest Global Dispatches)
      if (user) {
        const followedCodes: string[] = Array.isArray(user.followedCountries) ? user.followedCountries : [];
        if (followedCodes.length > 0) {
          const promises = followedCodes.slice(0, 5).map(async (code) => {
            const countryObj = getCountryByCode(code);
            const list = await fetchArticlesForCountry(code);
            return {
              country: countryObj,
              articles: list.slice(0, 4),
            };
          });
          const results = await Promise.all(promises);
          setFollowedCountryFeeds(results.filter((r) => r.articles.length > 0));
        } else {
          setFollowedCountryFeeds([]);
        }
      } else {
        // Guest mode: fetch 2 major global reference desks (different from detected)
        const globalCandidates = ['US', 'GB', 'ZA', 'GH', 'NG'].filter((c) => c !== matchedCountry.code).slice(0, 2);
        const promises = globalCandidates.map(async (code) => {
          const countryObj = getCountryByCode(code);
          const list = await fetchArticlesForCountry(code);
          return {
            country: countryObj,
            articles: list.slice(0, 3),
          };
        });
        const results = await Promise.all(promises);
        setGuestGlobalFeeds(results.filter((r) => r.articles.length > 0));
      }
    }

    detectLocationAndLoadNews();
  }, [user]);

  // Handle manual country change from modal
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

    // If guest changes country, display friendly invitation to save preference
    if (!user) {
      setAuthModalConfig({
        isOpen: true,
        title: `Viewing ${c.name} Local News`,
        message: `You are currently browsing verified political news for ${c.name}. Create your free account to lock in your primary newsroom and customize your daily My VoxPolis feed across up to 5 countries.`,
      });
    }
  };

  // Guest clicks on other country article
  const handleGuestGlobalArticleClick = (art: ArticleData, country: CountryConfig) => {
    setAuthModalConfig({
      isOpen: true,
      title: `Unlock ${country.name} Political News`,
      message: `Create your free account to read global political stories from ${country.name} and follow up to 5 countries in your personalized My VoxPolis feed.`,
    });
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
  const countrySlug = getCountrySlug(selectedCountry);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/90 border-b border-gray-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative gap-4">
          {/* Mobile Logo (left) */}
          <div className="flex md:hidden items-center">
            <Link href="/" className="flex items-center hover:opacity-95 transition">
              <SiteLogo variant="dark" className="h-9 w-auto" />
            </Link>
          </div>

          {/* Desktop Left Tagline */}
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-gray-400">
            <span>Global Civic Intelligence</span>
          </div>

          {/* Desktop Centered Logo */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-auto">
            <Link href="/" className="flex items-center hover:opacity-95 transition">
              <SiteLogo variant="dark" className="h-11 sm:h-12 w-auto" />
            </Link>
          </div>

          {/* Right Actions */}
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
                <Link
                  href="/profile"
                  className="hidden sm:flex items-center gap-1.5 text-xs text-blue-300 font-semibold bg-blue-950/70 border border-blue-800/60 px-3 py-1.5 rounded-full hover:border-blue-500 transition"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>My Account</span>
                </Link>
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
                  Sign Up Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Homepage Feed */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-12">
        {/* Country & Personalization Sub-Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-gray-800">
          {user ? (
            /* Logged-In User Status: My VoxPolis */
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black text-white">My VoxPolis</h1>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 font-semibold border border-blue-700/50">
                    Personalized Feed
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  {greeting}, {user.fullName || 'Citizen'} • Primary Newsroom:{' '}
                  <strong className="text-white">
                    {selectedCountry.flag} {selectedCountry.name}
                  </strong>
                </p>
              </div>
            </div>
          ) : (
            /* Guest User Status: Detected Country + Change Country */
            <div className="flex items-center gap-2 flex-wrap">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs font-medium text-gray-300">
                {isAutoDetected ? 'Detected country:' : 'Current region:'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-900 border border-gray-700 text-white font-bold text-xs shadow-sm">
                <span className="text-sm">{selectedCountry.flag}</span>
                <span>{selectedCountry.name}</span>
              </span>
              <button
                onClick={() => setIsCountryModalOpen(true)}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer ml-1"
              >
                Change country
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs font-semibold text-gray-400">
            {user ? (
              <Link
                href="/profile"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Customize Interests ({followedCountryFeeds.length} followed)</span>
              </Link>
            ) : (
              <span className="text-gray-400">
                Viewing local coverage •{' '}
                <Link href="/signup" className="text-blue-400 hover:underline">
                  Sign up for global feed →
                </Link>
              </span>
            )}
          </div>
        </div>

        {/* 5-Slide Featured Trending Carousel (Primary / Local Country) */}
        {loadingArticles ? (
          <div className="w-full h-80 rounded-3xl bg-gray-900 animate-pulse flex items-center justify-center text-gray-500 text-xs font-semibold">
            Loading trending political news for {selectedCountry.name}...
          </div>
        ) : activeSlide ? (
          <section className="relative rounded-3xl overflow-hidden border border-gray-800 bg-gray-900 shadow-2xl">
            <div className="relative h-[420px] sm:h-[480px] w-full">
              {/* eslint-disable-next-html-element-suppression */}
              <img
                src={getArticleImageUrl(activeSlide, currentSlideIndex)}
                alt={activeSlide.title}
                onError={(e) => {
                  const fb = getArticleFallbackUrl(activeSlide, currentSlideIndex);
                  const target = e.target as HTMLImageElement;
                  if (!target.src.endsWith(fb)) {
                    target.src = fb;
                  }
                }}
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
                    <span>
                      Source: <strong className="text-white">{activeSlide.source_name}</strong>
                    </span>
                    {activeSlide.created_at && (
                      <span className="hidden sm:inline">
                        • {formatExactTimestamp(activeSlide.created_at)}
                      </span>
                    )}
                  </div>
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

        {/* PRIMARY COUNTRY FEED SECTION (Featured) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>{selectedCountry.flag}</span>
                <span>{selectedCountry.name} News</span>
              </h2>
              <p className="text-xs text-gray-400">
                Live dispatches and verified updates from {selectedCountry.name}.
              </p>
            </div>

            <Link
              href={`/${countrySlug}`}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>Explore All {selectedCountry.name} News</span>
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
                {(gridArticles.length > 0 ? gridArticles : allArticles).slice(0, 6).map((art, idx) => (
                  <FeedCard key={art.id} article={art} index={idx} />
                ))}
              </div>

              <div className="text-center pt-2">
                <Link
                  href={`/${countrySlug}`}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-2xl shadow-xl transition transform hover:scale-105"
                >
                  <span>Read More {selectedCountry.name} News</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* LOGGED-IN USERS: FOLLOWED COUNTRIES SECTIONS ("My VoxPolis") */}
        {user && followedCountryFeeds.length > 0 && (
          <div className="space-y-12 pt-4">
            {followedCountryFeeds.map((f) => {
              const fSlug = getCountrySlug(f.country);
              return (
                <section key={f.country.code} className="space-y-6 pt-6 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <span>{f.country.flag}</span>
                        <span>{f.country.name} News</span>
                      </h3>
                      <p className="text-xs text-gray-400">
                        Followed Desk • Verified coverage from {f.country.name}.
                      </p>
                    </div>

                    <Link
                      href={`/${fSlug}`}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <span>Read More {f.country.name} News</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {f.articles.map((art, idx) => (
                      <FeedCard key={art.id} article={art} index={idx} />
                    ))}
                  </div>

                  <div className="text-right pt-1">
                    <Link
                      href={`/${fSlug}`}
                      className="text-xs font-extrabold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1.5"
                    >
                      <span>Go to {f.country.name} News Desk</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* LOGGED-IN USERS: INVITATION TO FOLLOW MORE COUNTRIES IF UNDER LIMIT */}
        {user && followedCountryFeeds.length === 0 && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-gray-900 to-slate-900 border border-blue-800/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Customize Your "My VoxPolis" Briefing</span>
              </h4>
              <p className="text-xs text-gray-400 max-w-xl">
                You are currently following your primary newsroom ({selectedCountry.name}). Choose up to 5 additional countries to receive their top political stories directly on your homepage.
              </p>
            </div>
            <Link
              href="/profile"
              className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              Follow Countries
            </Link>
          </div>
        )}

        {/* GUEST USERS: GLOBAL DISPATCHES (Clean, lock-free highlights with signup prompt on click) */}
        {!user && guestGlobalFeeds.length > 0 && (
          <div className="space-y-10 pt-4">
            <div className="border-t border-gray-800 pt-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-blue-400" />
                <span>Global Political Dispatches</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Essential political stories monitored across international newsrooms.
              </p>
            </div>

            {guestGlobalFeeds.map((f) => (
              <div key={f.country.code} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-gray-200 flex items-center gap-2">
                    <span>{f.country.flag}</span>
                    <span>{f.country.name} Highlights</span>
                  </h4>
                  <button
                    onClick={() =>
                      setAuthModalConfig({
                        isOpen: true,
                        title: `Explore ${f.country.name} Political News`,
                        message: `Create your free account to read international political stories from ${f.country.name} and follow up to 5 countries in your personalized My VoxPolis feed.`,
                      })
                    }
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Read More {f.country.name} News</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {f.articles.map((art, idx) => (
                    <FeedCard
                      key={art.id}
                      article={art}
                      index={idx}
                      onCardClick={() => handleGuestGlobalArticleClick(art, f.country)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Regional Country Selector Modal */}
      <RegionalCountrySelectorModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        selectedCountry={selectedCountry}
        onSelectCountry={handleSelectCountry}
      />

      {/* Welcoming Auth Prompt Modal (Zero lock icons) */}
      <AuthPromptModal
        isOpen={authModalConfig.isOpen}
        onClose={() => setAuthModalConfig({ isOpen: false })}
        title={authModalConfig.title}
        message={authModalConfig.message}
      />
    </div>
  );
}
