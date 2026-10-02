'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ALL_COUNTRIES, CountryConfig, getCountryByCode } from '@/config/countries';
import {
  PenTool,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  User,
  ArrowLeft,
  ShieldCheck,
  BookOpen,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';

export default function ColumnistSubmitPage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(getCountryByCode('NG') || ALL_COUNTRIES[0]);

  // Author credentials
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorBio, setAuthorBio] = useState('');

  // Article details
  const [targetCountry, setTargetCountry] = useState('NG');
  const [title, setTitle] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [agreedToPublish, setAgreedToPublish] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form submission state
  const [wordCount, setWordCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [content]);

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Featured image size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFeaturedImage(result);
      setFeaturedImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const clearFeaturedImage = () => {
    setFeaturedImage('');
    setFeaturedImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (wordCount < 500) {
      setErrorMsg(`Your article currently contains ${wordCount} words. Voxpolis editorial standards require at least 500 words for accredited op-eds.`);
      return;
    }

    if (!agreedToPublish) {
      setErrorMsg('Please confirm agreement for Voxpolis to publish your political commentary by ticking the declaration box.');
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
            href="/news"
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
              <h1 className="text-2xl sm:text-3xl font-black">Columnist & Op-Ed Submissions</h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Independent political perspectives, policy analysis, and governance reporting.
              </p>
            </div>
          </div>
        </div>

        {/* Columnist Editorial Charter & Rules Banner */}
        <section className="p-6 rounded-3xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-indigo-950/30 border border-blue-800/40 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-extrabold uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Voxpolis Editorial Rules & Columnist Charter</span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
            We Welcome Independent Thought & Rigorous Political Analysis
          </h2>

          <p className="text-xs text-gray-300 leading-relaxed">
            Voxpolis provides an open, authoritative civic platform for analysts, scholars, citizens, and political commentators across 119 nations. We invite well-reasoned, independent opinions strictly focused on political and public affairs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-gray-800/80 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="text-blue-400">1.</span> Strictly Political & Governance Focus
              </span>
              <p className="text-[11px] text-gray-400">
                Articles must address elections, policy, legislation, institutional governance, regional diplomacy, or civic affairs.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-gray-800/80 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="text-blue-400">2.</span> 500+ Words Minimum Substantive Depth
              </span>
              <p className="text-[11px] text-gray-400">
                Submissions must be at least 500 words long to ensure deep, analytical reporting. There is no upper limit.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-gray-800/80 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="text-blue-400">3.</span> Decency & Civil Public Discourse
              </span>
              <p className="text-[11px] text-gray-400">
                We strictly prohibit abusive language, defamation, profanity, and hate speech. We respect differing views expressed with dignity.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-gray-800/80 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="text-blue-400">4.</span> Originality & No Commercial Links
              </span>
              <p className="text-[11px] text-gray-400">
                Content must be your original work. Promotional backlinking or affiliate URLs are rejected automatically.
              </p>
            </div>
          </div>
        </section>

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
                href="/news"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition"
              >
                Return to Live News
              </Link>
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setTitle('');
                  setContent('');
                  setAgreedToPublish(false);
                  clearFeaturedImage();
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

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Short Author Bio / Institutional Affiliation</label>
                  <input
                    type="text"
                    value={authorBio}
                    onChange={(e) => setAuthorBio(e.target.value)}
                    placeholder="Political analyst, Senior Fellow at Governance Institute..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  placeholder="The Fiscal Realities of Energy Subsidies Across Regional States"
                  className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Featured Image Attachment: File Upload + Optional URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 block">Featured Photograph (Optional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="columnist-photo-file"
                    />
                    <label
                      htmlFor="columnist-photo-file"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-700 hover:border-blue-500 bg-slate-950 cursor-pointer text-xs font-semibold text-gray-300 hover:text-white transition"
                    >
                      <Upload className="w-4 h-4 text-blue-400" />
                      <span>Upload Photo from Device</span>
                    </label>
                  </div>

                  <div>
                    <input
                      type="url"
                      value={featuredImagePreview && !featuredImage.startsWith('http') ? '' : featuredImage}
                      onChange={(e) => {
                        setFeaturedImage(e.target.value);
                        setFeaturedImagePreview(e.target.value || null);
                      }}
                      placeholder="Or paste an image web URL..."
                      className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Image Preview thumbnail */}
                {featuredImagePreview && (
                  <div className="relative w-36 h-24 rounded-xl overflow-hidden border border-gray-700 mt-2 group">
                    {/* eslint-disable-next-html-element-suppression */}
                    <img
                      src={featuredImagePreview}
                      alt="Featured Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearFeaturedImage}
                      className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded-full transition"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="text-xs font-bold text-gray-300 block">
                    Article Body (500+ Words Minimum) *
                  </label>
                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-full border transition ${
                      wordCount >= 500
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
                        : 'bg-amber-950/60 text-amber-300 border-amber-700'
                    }`}
                  >
                    {wordCount >= 500
                      ? `${wordCount} words (Minimum 500 met ✓)`
                      : `${wordCount} words (At least 500 required)`}
                  </span>
                </div>
                <textarea
                  rows={14}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Compose your comprehensive political analysis or op-ed here. Detail the legislative context, regional implications, stakeholders involved, and projected policy outcomes..."
                  className="w-full text-xs sm:text-sm p-4 rounded-2xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Articles can extend to 1,000+ words. Structure your arguments with clear paragraphs and factual references.
                </p>
              </div>

              {/* Publisher Agreement Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-950 border border-gray-800 hover:border-gray-700 cursor-pointer select-none transition">
                  <input
                    type="checkbox"
                    checked={agreedToPublish}
                    onChange={(e) => setAgreedToPublish(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded bg-gray-900 border-gray-700 focus:ring-blue-500 shrink-0"
                  />
                  <span className="text-xs text-gray-300 leading-relaxed">
                    I confirm that this political commentary is my original intellectual work and adheres strictly to Voxpolis standards of civil discourse. I grant Voxpolis the right to publish and syndicate this content across its multi-national platform upon editorial approval.
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 flex items-center justify-between flex-wrap gap-4">
              <span className="text-xs text-gray-400">
                All submissions undergo editorial review before appearing on the live country feed.
              </span>
              <button
                type="submit"
                disabled={isSubmitting || wordCount < 500 || !agreedToPublish}
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
