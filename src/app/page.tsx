'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';
import FeedCard from '@/components/feed/FeedCard';
import Footer from '@/components/layout/Footer';
import { createClient } from '@/lib/supabase/client';
import { ALL_COUNTRIES, CountryConfig, getCountryByCode } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData, formatExactTimestamp, getArticleImageUrl } from '@/lib/news';
import {
  ArrowRight,
  Globe2,
  Chrome,
  Flame,
  FileText,
  Users,
  Vote,
  MapPin,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  UserCheck,
} from 'lucide-react';

export default function LandingPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  // IP-detected location & preview feed articles
  const [detectedCountry, setDetectedCountry] = useState<CountryConfig>(ALL_COUNTRIES[0]);
  const [allArticles, setAllArticles] = useState<ArticleData[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

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
      let countryCode = 'NG';

      const savedCountry = typeof window !== 'undefined' ? localStorage.getItem('voxpolis_primary_country') : null;

      if (savedCountry) {
        countryCode = savedCountry;
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
            countryCode = 'NG';
          }
        }
      }

      const country = getCountryByCode(countryCode);
      setDetectedCountry(country);

      try {
        const articles = await fetchArticlesForCountry(country.code);
        setAllArticles(articles);
      } catch (e) {
        console.warn('Failed to load preview articles:', e);
      } finally {
        setLoadingArticles(false);
      }
    }

    detectLocationAndLoadNews();
  }, []);

  // Auto-play featured carousel slider every 6 seconds
  useEffect(() => {
    if (allArticles.length === 0) return;
    const featuredCount = Math.min(3, allArticles.length);
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % featuredCount);
    }, 6000);
    return () => clearInterval(interval);
  }, [allArticles]);

  const handleGoogleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Top 3 articles for Featured Slider Hero
  const featuredArticles = allArticles.slice(0, 3);
  // Grid section takes remaining articles (max 6) so featured items are NOT duplicated
  const gridArticles = allArticles.slice(3, 9);

  const activeSlide = featuredArticles[currentSlideIndex] || featuredArticles[0];
  const countrySlug = detectedCountry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-600 selection:text-white flex flex-col">
      {/* Header Bar */}
      <header className="max-w-7xl mx-auto px-6 h-20 w-full flex items-center justify-between">
        <SiteLogo variant="light" className="h-9 w-auto" />
        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link href="/about" className="text-gray-300 hover:text-white transition hidden sm:inline">
            About Us
          </Link>
          {user ? (
            <Link
              href="/feed"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Go to My Feed</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-3 py-1.5 text-gray-300 hover:text-white transition">
                Log In
              </Link>
              <Link href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center text-center">
        {/* Human-centric Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
          <Globe2 className="w-3.5 h-3.5 text-blue-400" />
          <span>Global Independent News & Civic Voice</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight max-w-4xl">
          Unbiased Political News <br />
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            Tailored to Your Nation
          </span>
        </h1>

        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mt-4 leading-relaxed">
          Voxpolis delivers real-time, independent political coverage and executive fact summaries from 230+ nations. Access direct regional political developments and active civic polls with zero paywalls.
        </p>

        {/* Logged in User Banner */}
        {user ? (
          <div className="mt-6 p-4 rounded-2xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-between gap-4 max-w-md w-full text-xs">
            <span className="text-blue-200 font-semibold truncate">
              Signed in as <strong>{user.email}</strong>
            </span>
            <Link
              href="/feed"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow transition shrink-0"
            >
              Open My Feed →
            </Link>
          </div>
        ) : (
          /* Guest CTAs */
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
            <Link
              href="/signup"
              className="w-full sm:w-auto flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>Sign Up Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full sm:w-auto flex-1 py-3.5 px-6 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              <Chrome className="w-4 h-4 text-blue-400" />
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        <div className="mt-4">
          <Link href="/feed" className="text-xs font-bold text-gray-400 hover:text-white underline transition">
            Browse as Guest →
          </Link>
        </div>

        {/* FEATURED NEWS CAROUSEL SLIDER (Top 3 Stories) with CLS Skeleton Placeholder */}
        <section className="mt-12 w-full max-w-5xl text-left">
          {loadingArticles ? (
            /* Skeleton Placeholder matching Carousel dimensions (CLS Prevention) */
            <div className="h-80 sm:h-[420px] w-full rounded-3xl bg-gray-900/80 border border-gray-800 animate-pulse p-6 sm:p-10 flex flex-col justify-end space-y-4">
              <div className="h-6 bg-gray-800 rounded w-1/4" />
              <div className="h-10 bg-gray-800 rounded w-4/5" />
              <div className="h-12 bg-gray-800/60 rounded w-full" />
            </div>
          ) : featuredArticles.length > 0 && activeSlide ? (
            <div className="relative rounded-3xl overflow-hidden border border-gray-800 bg-gray-900 shadow-2xl group">
              {/* Featured Background Image */}
              <div className="relative h-80 sm:h-[420px] w-full overflow-hidden bg-slate-950">
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
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent" />
              </div>

              {/* Slider Content Overlay */}
              <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 flex flex-col justify-end space-y-3 z-10">
                <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-red-600 text-white font-extrabold text-[11px] rounded-full uppercase tracking-wider shadow">
                      FEATURED REPORT
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
                  <h2 className="text-xl sm:text-3xl font-black text-white leading-snug drop-shadow-md">
                    {activeSlide.title}
                  </h2>
                </Link>

                <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 max-w-3xl leading-relaxed">
                  {activeSlide.snippet}
                </p>

                {/* Slider Controls & Progress Bar */}
                <div className="pt-2 flex items-center justify-between">
                  {/* Slide Indicators */}
                  <div className="flex items-center gap-2">
                    {featuredArticles.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          currentSlideIndex === idx ? 'w-8 bg-blue-500' : 'w-2 bg-gray-600 hover:bg-gray-400'
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
                      className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-gray-700 transition"
                      title="Previous Slide"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentSlideIndex((prev) => (prev + 1) % featuredArticles.length)
                      }
                      className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-gray-700 transition"
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

        {/* 1. Trust and Credibility Stat Strip */}
        <section className="mt-16 w-full max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-gray-900/60 border border-gray-800/80 backdrop-blur-md shadow-xl">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-700/40 text-left">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Globe2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-white">230+</div>
                <div className="text-[11px] font-bold text-gray-300">Nations Covered</div>
                <div className="text-[10px] text-gray-500">Direct regional reporting</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-700/40 text-left">
              <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-white">14,800+</div>
                <div className="text-[11px] font-bold text-gray-300">Daily Reports</div>
                <div className="text-[10px] text-gray-500">Updated hourly worldwide</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-700/40 text-left">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-white">185,000+</div>
                <div className="text-[11px] font-bold text-gray-300">Active Readers</div>
                <div className="text-[10px] text-gray-500">Citizens & researchers</div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Dynamic Country Feed Section (Non-duplicated Cards Grid) */}
        <section className="mt-16 w-full max-w-6xl text-left space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-800/80">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              <h2 className="text-lg sm:text-2xl font-black text-white">
                {detectedCountry.flag} {detectedCountry.name} | Politics
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-300 text-[11px] font-bold">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span>Auto-Detected Location ({detectedCountry.code})</span>
              </span>
            </div>
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
            /* Non-duplicated 6-Card Grid */
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(gridArticles.length > 0 ? gridArticles : allArticles.slice(0, 6)).map((art) => (
                  <FeedCard key={art.id} article={art} />
                ))}
              </div>

              {/* View Full Country Feed Button */}
              <div className="text-center pt-4">
                <Link
                  href={`/${countrySlug}`}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-2xl shadow-xl transition transform hover:scale-105"
                >
                  <span>View Full {detectedCountry.flag} {detectedCountry.name} Feed</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* 3. How It Works Section */}
        <section className="mt-20 w-full max-w-5xl text-left space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Simple & Transparent</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">How Voxpolis Works</h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
              Three clear steps to objective political news and regional executive summaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-gray-900/70 border border-gray-800 shadow-lg space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-black">
                1
              </div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-blue-400" />
                <span>Verified Ingestion</span>
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                We gather news directly from reputable national press outlets and verified official digests across 230+ countries.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-900/70 border border-gray-800 shadow-lg space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-black">
                2
              </div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Editorial Breakdown</span>
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Our editorial team synthesizes core policy facts, contextual background, and key legislative provisions for objective clarity.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-gray-900/70 border border-gray-800 shadow-lg space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black">
                3
              </div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Vote className="w-4 h-4 text-indigo-400" />
                <span>Citizen Dialogue</span>
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Participate in active sentiment polls, voice your perspective, and join non-partisan discussions with global readers.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
