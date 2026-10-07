'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { ALL_COUNTRIES, CountryConfig } from '@/config/countries';
import {
  Globe2,
  FileText,
  Users,
  ShieldCheck,
  Newspaper,
  Vote,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function AboutPage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(ALL_COUNTRIES[0]);
  const [pageData, setPageData] = useState({
    badge: 'Global Independent News & Civic Voice',
    title: 'Unbiased Political News Tailored to Your Nation',
    subtitle: `Voxpolis delivers real-time, independent political coverage and executive fact summaries from ${ALL_COUNTRIES.length} supported nations. Access direct regional political developments and active civic sentiment polls with zero paywalls.`,
    mission: 'Our mission is to bring concise, factual news straight to citizens\' doorsteps worldwide, with balanced regional perspectives and civic participation without corporate paywalls.',
  });

  useEffect(() => {
    async function loadPage() {
      try {
        const res = await fetch('/api/site-pages?page=about');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setPageData((prev) => ({ ...prev, ...json.data }));
          }
        }
      } catch (e) {
        console.warn('Using default about content', e);
      }
    }
    loadPage();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-blue-600 selection:text-white">
      <Header selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 sm:py-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Globe2 className="w-3.5 h-3.5 text-blue-400" />
            <span>{pageData.badge}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-3xl mx-auto">
            {pageData.title}
          </h1>

          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {pageData.subtitle}
          </p>

          <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
            <Link
              href="/signup"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <span>Join Voxpolis Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/news"
              className="px-6 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white font-bold text-xs rounded-xl transition"
            >
              Explore Verified News →
            </Link>
          </div>
        </section>

        {/* Global Impact Stat Cards with Accurate Figures */}
        <section className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 rounded-3xl bg-gray-900/60 border border-gray-800/80 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/40 border border-gray-700/40">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                <Globe2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{ALL_COUNTRIES.length}</div>
                <div className="text-xs font-bold text-gray-200">Nations Covered</div>
                <div className="text-[11px] text-gray-400">Direct regional reporting</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/40 border border-gray-700/40">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">1,500+</div>
                <div className="text-xs font-bold text-gray-200">Daily Reports</div>
                <div className="text-[11px] text-gray-400">Updated hourly worldwide</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/40 border border-gray-700/40">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">15,000+</div>
                <div className="text-xs font-bold text-gray-200">Active Readers</div>
                <div className="text-[11px] text-gray-400">Citizens & researchers</div>
              </div>
            </div>
          </div>
        </section>

        {/* How Voxpolis Works (3 Steps) */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Simple & Transparent</span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">How Voxpolis Works</h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
              Three clear steps to objective political news and regional executive summaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 shadow-xl space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-black text-lg">
                1
              </div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-400" />
                <span>Verified Ingestion</span>
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                We gather news directly from reputable national press outlets and verified official digests across {ALL_COUNTRIES.length} countries.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 shadow-xl space-y-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-black text-lg">
                2
              </div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Editorial Breakdown</span>
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Our editorial team synthesizes core policy facts, contextual background, and key legislative provisions for objective clarity.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 shadow-xl space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-lg">
                3
              </div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Vote className="w-5 h-5 text-indigo-400" />
                <span>Citizen Dialogue</span>
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Participate in active sentiment polls, voice your perspective, and join non-partisan discussions with global readers.
              </p>
            </div>
          </div>
        </section>

        {/* Core Editorial Standards */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/20 space-y-6">
          <h3 className="text-xl sm:text-2xl font-black text-white text-center">Our Core Editorial Standards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-300 leading-relaxed">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block text-sm mb-1">Non-Partisan Objectivity</strong>
                Voxpolis is strictly independent. We do not take political sides or endorse candidates. Every executive summary focuses on verifiable policy facts and legislative records.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block text-sm mb-1">Equal National Coverage</strong>
                Whether covering major geopolitical powers or emerging democracies, every nation receives dedicated, localized political feeds with country-specific context.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block text-sm mb-1">Zero Paywalls for Public Facts</strong>
                Core political updates and public opinion polls are freely accessible to all readers without subscription fees.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block text-sm mb-1">Civilized Public Discourse</strong>
                All member comments are moderated to prevent link spam and maintain respectful policy dialogue across borders.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
