'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SiteLogo from '@/components/branding/SiteLogo';
import { ALL_COUNTRIES, CountryConfig } from '@/config/countries';
import { useState } from 'react';
import Link from 'next/link';
import {
  Globe2,
  FileText,
  Users,
  ShieldCheck,
  Newspaper,
  Vote,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function AboutPage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(ALL_COUNTRIES[0]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-blue-600 selection:text-white">
      <Header selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 sm:py-16 space-y-16">
        {/* Top Hero Heading */}
        <section className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Globe2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Global Independent News & Civic Voice</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-3xl mx-auto">
            Unbiased Political News <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Tailored to Your Nation
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Voxpolis delivers real-time, independent political coverage and executive fact summaries from 230+ nations. Access direct regional political developments and active civic polls with zero paywalls.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/signup"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <span>Join Voxpolis Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/feed"
              className="px-6 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white font-bold text-xs rounded-xl transition"
            >
              Explore Country Feeds →
            </Link>
          </div>
        </section>

        {/* Global Impact Stat Cards */}
        <section className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 rounded-3xl bg-gray-900/60 border border-gray-800/80 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/40 border border-gray-700/40">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                <Globe2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">230+</div>
                <div className="text-xs font-bold text-gray-200">Nations Covered</div>
                <div className="text-[11px] text-gray-400">Direct regional reporting</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/40 border border-gray-700/40">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">14,800+</div>
                <div className="text-xs font-bold text-gray-200">Daily Reports</div>
                <div className="text-[11px] text-gray-400">Updated hourly worldwide</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-800/40 border border-gray-700/40">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">185,000+</div>
                <div className="text-xs font-bold text-gray-200">Active Readers</div>
                <div className="text-[11px] text-gray-400">Citizens & researchers</div>
              </div>
            </div>
          </div>
        </section>

        {/* How Voxpolis Works */}
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
                We gather news directly from reputable national press outlets and verified official digests across 230+ countries.
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

        {/* Our Editorial Pillars & Core Values */}
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

      <Footer />
    </div>
  );
}
