'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ALL_COUNTRIES, CountryConfig, getCountryByCode } from '@/config/countries';
import { PenTool, CheckCircle2, AlertCircle, FileText, Image as ImageIcon, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ColumnistSubmitPage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(getCountryByCode('NG') || ALL_COUNTRIES[0]);

  // Author details
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorBio, setAuthorBio] = useState('');
  const [authorAvatar, setAuthorAvatar] = useState('');

  // Article details
  const [targetCountry, setTargetCountry] = useState('NG');
  const [title, setTitle] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [content, setContent] = useState('');

  // Form submission state
  const [wordCount, setWordCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (wordCount < 500) {
      setErrorMsg(`Your article is currently ${wordCount} words. Voxpolis editorial guidelines require a minimum of 500 words for accredited op-eds.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/columnist/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: authorName,
          author_email: authorEmail,
          author_bio: authorBio,
          author_avatar: authorAvatar || '/breaking-news-banner.png',
          country_code: targetCountry,
          title,
          content,
          featured_image_url: featuredImage || '/breaking-news-banner.png',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to submit article for review.');
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Header selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        <div>
          <Link
            href="/feed"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 mb-4 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Live News</span>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">Columnist & Op-Ed Editorial Desk</h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Submit original political commentary and policy analysis. Submissions must be 500+ words and adhere to civilized civic discourse.
              </p>
            </div>
          </div>
        </div>

        {isSuccess ? (
          <div className="p-8 rounded-3xl bg-slate-900 border border-emerald-500/30 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">Op-Ed Submitted for Editorial Review!</h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-lg mx-auto leading-relaxed">
              Thank you, <span className="text-white font-bold">{authorName}</span>. Your column titled &ldquo;<span className="text-white font-semibold">{title}</span>&rdquo; has been routed to the Voxpolis Editorial Desk for verification and publication.
            </p>
            <div className="pt-4 flex items-center justify-center gap-3">
              <Link
                href="/feed"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition"
              >
                Return to Live Feed
              </Link>
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setTitle('');
                  setContent('');
                }}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl transition"
              >
                Write Another Piece
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-xl">
            {errorMsg && (
              <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Author Profile Information */}
            <div className="space-y-4 border-b border-gray-800 pb-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Columnist Credentials</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Dr. Amina Bello"
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    placeholder="amina@policyinstitute.org"
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Profile Photo Image URL *</label>
                  <input
                    type="url"
                    value={authorAvatar}
                    onChange={(e) => setAuthorAvatar(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Primary Country Beat *</label>
                  <select
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ALL_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Short Author Bio / Affiliation</label>
                <input
                  type="text"
                  value={authorBio}
                  onChange={(e) => setAuthorBio(e.target.value)}
                  placeholder="Political analyst, Senior Research Fellow at the African Center for Governance..."
                  className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Article Content */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">Article Content</h2>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Article Headline *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="The Fiscal Realities of Fuel Subsidy Deregulation Across Regional States"
                  className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Featured Photograph URL (Header Image)</label>
                <input
                  type="url"
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-300 block">Article Body (500+ Words Required) *</label>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                      wordCount >= 500
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                        : 'bg-amber-950/60 text-amber-400 border-amber-800'
                    }`}
                  >
                    {wordCount} / 500 words
                  </span>
                </div>
                <textarea
                  rows={14}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Compose your comprehensive political analysis or op-ed here. Detail the legislative context, regional implications, stakeholders involved, and projected outcomes..."
                  className="w-full text-xs sm:text-sm p-4 rounded-2xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Tip: Structure your column into clear thematic sections, reference factual data or policy frameworks, and maintain a constructive, scholarly tone.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                All submissions undergo editorial review before appearing on the live country feed.
              </span>
              <button
                type="submit"
                disabled={isSubmitting || wordCount < 500}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <PenTool className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Column for Review'}</span>
              </button>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
