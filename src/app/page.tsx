'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/branding/SiteLogo';
import FeedCard from '@/components/feed/FeedCard';
import { createClient } from '@/lib/supabase/client';
import { ALL_COUNTRIES, CountryConfig, getCountryByCode } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData } from '@/lib/news';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Globe2,
  Chrome,
  Flame,
  FileText,
  Users,
  Vote,
  MapPin,
  Newspaper,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // IP-detected location & preview feed articles
  const [detectedCountry, setDetectedCountry] = useState<CountryConfig>(ALL_COUNTRIES[0]);
  const [previewArticles, setPreviewArticles] = useState<ArticleData[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        // Returning logged in user goes straight to personalized feed
        router.replace('/feed');
      } else {
        setCheckingAuth(false);
      }
    }
    checkUser();
  }, [router, supabase]);

  // Automatic IP-based Geolocation Detection & Live Feed Loading
  useEffect(() => {
    async function detectLocationAndLoadNews() {
      setLoadingArticles(true);
      let countryCode = 'NG';

      // 1. Check if user already has a saved primary country in localStorage
      const savedCountry = typeof window !== 'undefined' ? localStorage.getItem('voxpolis_primary_country') : null;

      if (savedCountry) {
        countryCode = savedCountry;
      } else {
        // 2. IP Detection via lightweight fast geolocation lookup
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

          const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data.country_code) {
              countryCode = data.country_code;
            }
          }
        } catch {
          countryCode = 'NG';
        }
      }

      const country = getCountryByCode(countryCode);
      setDetectedCountry(country);

      try {
        const articles = await fetchArticlesForCountry(country.code);
        // Display 6 responsive preview cards so section feels rich and active
        setPreviewArticles(articles.slice(0, 6));
      } catch (e) {
        console.warn('Failed to load preview articles:', e);
      } finally {
        setLoadingArticles(false);
      }
    }

    if (!checkingAuth) {
      detectLocationAndLoadNews();
    }
  }, [checkingAuth]);

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

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <SiteLogo variant="light" className="h-10 w-auto animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-600 selection:text-white">
      {/* Header Bar */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <SiteLogo variant="light" className="h-9 w-auto" />
        <div className="flex items-center gap-3 text-xs font-semibold">
          <Link href="/login" className="px-4 py-2 text-gray-300 hover:text-white transition">
            Log In
          </Link>
          <Link href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-10 sm:py-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Personalized Political Intelligence</span>
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

        {/* CTAs */}
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

        <div className="mt-4">
          <Link href="/feed" className="text-xs font-bold text-gray-400 hover:text-white underline transition">
            Browse as Guest →
          </Link>
        </div>

        {/* 1. Trust and Credibility Stat Strip */}
        <section className="mt-12 w-full max-w-4xl">
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

        {/* 2. How It Works Section (Editorial & Non-AI) */}
        <section className="mt-16 w-full max-w-5xl text-left space-y-6">
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

        {/* 3. IP-Based Dynamic Preview Feed (6 Cards Grid) */}
        <section className="mt-16 w-full max-w-6xl text-left space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-800/80">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-black text-white">
                Live Preview for {detectedCountry.flag} {detectedCountry.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-300 text-[11px] font-bold">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span>Auto-Detected Location ({detectedCountry.code})</span>
              </span>
              <span className="text-[10px] text-gray-500 font-semibold hidden sm:inline">Updated Real-Time</span>
            </div>
          </div>

          {loadingArticles ? (
            /* Skeleton Loading State for 6 Cards */
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
            /* Responsive 6-Card Feed Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {previewArticles.map((art) => (
                <FeedCard key={art.id} article={art} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 text-center text-xs text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Voxpolis Platform (voxpolis.app). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-gray-300">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-300">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
