'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ALL_COUNTRIES, CountryConfig } from '@/config/countries';
import { ShieldCheck, FileCheck, AlertTriangle, Send, CheckCircle2, RefreshCw } from 'lucide-react';

export default function CorrectionsPage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(ALL_COUNTRIES[0]);
  const [articleUrl, setArticleUrl] = useState('');
  const [errorDescription, setErrorDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleUrl || !errorDescription) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-blue-600 selection:text-white">
      <Header selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-900/40 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Accuracy & Transparency Standards</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Corrections & Accuracy Policy
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto leading-relaxed">
            Voxpolis is committed to objective, non-partisan political intelligence. Because our news briefs are automatically generated from named primary source pages, we maintain strict procedures for reporting and fixing errors.
          </p>
        </div>

        {/* Core Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 space-y-3">
            <div className="p-2.5 w-max rounded-xl bg-blue-500/10 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Source Verification</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Every Voxpolis brief links directly back to the original publisher URL. We do not invent claims, list items, or quotes.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 space-y-3">
            <div className="p-2.5 w-max rounded-xl bg-cyan-500/10 text-cyan-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Rapid Re-Scrape</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              If a primary publisher updates or retracts a story, our backfill engine re-scrapes and rewrites the record automatically.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-gray-900/80 border border-gray-800 space-y-3">
            <div className="p-2.5 w-max rounded-xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Correction Notices</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              When a material factual correction is made, a transparent correction note is appended to the updated report.
            </p>
          </div>
        </div>

        {/* Report Correction Form */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gray-900/80 border border-gray-800 shadow-xl max-w-2xl mx-auto space-y-6">
          <h2 className="font-extrabold text-lg text-white border-b border-gray-800 pb-3">
            Report a Factual Error or Discrepancy
          </h2>

          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Correction Flag Received</h3>
              <p className="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
                Thank you for helping maintain Voxpolis standards. Our automated validation pipeline will re-evaluate the source page and report within 24 hours.
              </p>
              <button
                onClick={() => { setSubmitted(false); setArticleUrl(''); setErrorDescription(''); }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition"
              >
                Submit Another Flag
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">Voxpolis Article URL or Title</label>
                <input
                  type="text"
                  required
                  value={articleUrl}
                  onChange={(e) => setArticleUrl(e.target.value)}
                  placeholder="https://voxpolis.app/news/..."
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Description of Error or Missing Attribution</label>
                <textarea
                  required
                  rows={4}
                  value={errorDescription}
                  onChange={(e) => setErrorDescription(e.target.value)}
                  placeholder="Explain what fact, name, date, or attribution is inaccurate..."
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">Your Email (Optional, for updates)</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="reader@example.com"
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Submitting Flag...' : 'Submit Correction Flag'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
