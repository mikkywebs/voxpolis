'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/branding/SiteLogo';
import { SUPPORTED_COUNTRIES, CountryConfig, getCountrySlug } from '@/config/countries';
import { Compass, Search, ArrowRight, ShieldAlert, Globe } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const [preferredCountry, setPreferredCountry] = useState<CountryConfig>(SUPPORTED_COUNTRIES[0]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Detect stored preference or locale
    try {
      const stored = localStorage.getItem('voxpolis_country_preference');
      if (stored) {
        const found = SUPPORTED_COUNTRIES.find((c) => c.code === stored || getCountrySlug(c) === stored);
        if (found) setPreferredCountry(found);
      }
    } catch {
      // fallback to default
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-gray-800 bg-slate-900/90 px-6 py-4 flex items-center justify-between">
        <Link href="/feed" className="flex items-center gap-2">
          <SiteLogo variant="full" className="h-8 w-auto" />
        </Link>
        <Link
          href={`/${getCountrySlug(preferredCountry)}`}
          className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
        >
          <span>{preferredCountry.flag}</span>
          <span>{preferredCountry.name} Desk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main 404 Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-bold uppercase tracking-wider mb-6">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>404 • Resource Not Found</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
          This Brief or Page is Unavailable
        </h1>

        <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto mb-8 leading-relaxed">
          The political article, official dispatch, or page you were seeking may have been renamed, archived, or does not exist at this address.
        </p>

        {/* Quick Search */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-md mb-10">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search political topics or archives..."
              className="w-full text-xs sm:text-sm p-3.5 pl-11 pr-24 rounded-2xl border border-gray-800 bg-slate-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xl"
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-4 top-4" />
            <button
              type="submit"
              className="absolute right-2 top-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition"
            >
              Search
            </button>
          </div>
        </form>

        {/* Smart Country Recommendation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left">
          {/* Country Hub Card */}
          <Link
            href={`/${getCountrySlug(preferredCountry)}`}
            className="p-5 rounded-2xl bg-slate-900 border border-gray-800 hover:border-blue-500/60 transition group flex flex-col justify-between"
          >
            <div>
              <div className="text-2xl mb-2">{preferredCountry.flag}</div>
              <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition">
                {preferredCountry.name} Political Feed
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Explore real-time executive reports, elections, and national coverage.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-400">
              <span>Go to {preferredCountry.name} Feed</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Global News Card */}
          <Link
            href="/feed"
            className="p-5 rounded-2xl bg-slate-900 border border-gray-800 hover:border-purple-500/60 transition group flex flex-col justify-between"
          >
            <div>
              <div className="text-2xl mb-2">🌐</div>
              <h3 className="font-bold text-sm text-white group-hover:text-purple-400 transition">
                Global Intelligence Feed
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                View cross-border political briefings and international civic sentiment.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-purple-400">
              <span>Open Global Desk</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-6 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Voxpolis. Independent Global Political Journalism.</p>
      </footer>
    </div>
  );
}
