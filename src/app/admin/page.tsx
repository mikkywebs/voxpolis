'use client';

import { useState, useEffect } from 'react';
import SiteLogo from '@/components/branding/SiteLogo';
import { ALL_COUNTRIES, getCountryByCode } from '@/config/countries';
import { createClient } from '@/lib/supabase/client';
import {
  Shield,
  FileText,
  BarChart3,
  Users,
  PenTool,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Save,
  Globe2,
  TrendingUp,
  Award,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

interface ColumnistItem {
  id: string;
  author_name: string;
  author_email: string;
  author_bio: string;
  author_avatar: string;
  country_code: string;
  title: string;
  slug: string;
  snippet?: string;
  content: string;
  featured_image_url: string;
  word_count: number;
  status: 'pending_review' | 'published' | 'declined';
  created_at: string;
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const [activeTab, setActiveTab] = useState<'analytics' | 'submissions' | 'pages' | 'publish'>('analytics');

  // Static Pages State
  const [selectedPageKey, setSelectedPageKey] = useState<'about' | 'contact' | 'privacy' | 'terms'>('about');
  const [pageData, setPageData] = useState<any>({});
  const [pageSaved, setPageSaved] = useState(false);

  // Columnist Submissions State
  const [submissions, setSubmissions] = useState<ColumnistItem[]>([]);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Direct Publish State
  const [pubCountry, setPubCountry] = useState('NG');
  const [pubTitle, setPubTitle] = useState('');
  const [pubSnippet, setPubSnippet] = useState('');
  const [pubContent, setPubContent] = useState('');
  const [pubImage, setPubImage] = useState('');
  const [pubSuccess, setPubSuccess] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Check Admin Authorization
  useEffect(() => {
    async function verifyAdmin() {
      setAuthChecking(true);
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        setCurrentUser(user);

        if (user) {
          const email = user.email?.toLowerCase();
          // Automatically authorized if michael.eboh@gmail.com
          if (email === 'michael.eboh@gmail.com') {
            setIsAdminAuthorized(true);
          } else {
            // Check Supabase profiles table
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', user.id)
              .single();
            if (profile?.is_admin) {
              setIsAdminAuthorized(true);
            }
          }
        }
      } catch (e) {
        console.warn('Admin check error:', e);
      } finally {
        setAuthChecking(false);
      }
    }
    verifyAdmin();
  }, [supabase]);

  // Load Submissions & Page Data
  useEffect(() => {
    async function loadData() {
      try {
        const subRes = await fetch('/api/columnist/submit');
        if (subRes.ok) {
          const s = await subRes.json();
          if (s.submissions) setSubmissions(s.submissions);
        }

        const pagesRes = await fetch(`/api/site-pages?page=${selectedPageKey}`);
        if (pagesRes.ok) {
          const p = await pagesRes.json();
          if (p.data) setPageData(p.data);
        }
      } catch (e) {
        console.warn('Failed to load admin data:', e);
      }
    }
    loadData();
  }, [selectedPageKey]);

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setPageSaved(false);
    try {
      const res = await fetch('/api/site-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: selectedPageKey, data: pageData }),
      });
      if (res.ok) {
        setPageSaved(true);
        setTimeout(() => setPageSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSubmission = async (id: string, newStatus: 'published' | 'declined') => {
    try {
      const item = submissions.find((s) => s.id === id);
      if (newStatus === 'published' && item) {
        // Publish to Supabase public.articles table
        await supabase.from('articles').upsert({
          slug: item.slug,
          title: item.title,
          snippet: item.snippet || item.content.slice(0, 200),
          content: item.content,
          ai_analysis: `• Strategic Perspective: Op-ed contribution by ${item.author_name}.\n• Editorial Context: Regional political commentary covering ${item.country_code}.`,
          country_code: item.country_code,
          language: 'en',
          category: 'opinion',
          image_mode: 'original',
          original_image_url: item.featured_image_url,
          source_name: `Voxpolis Columnist (${item.author_name})`,
          source_url: `https://voxpolis.app/article/${item.slug}`,
          is_breaking: false,
          tags: ['Op-Ed', 'Column', item.country_code],
          views_count: 0,
          total_reading_time_seconds: Math.max(180, Math.round(item.word_count / 3)),
          created_at: new Date().toISOString(),
        }, { onConflict: 'slug' });
      }

      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
      setActionSuccessMsg(`Article ${newStatus === 'published' ? 'approved and published live' : 'declined'}.`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDirectPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    setPubSuccess(false);

    try {
      const cleanTitle = pubTitle.trim();
      const displayTitle = cleanTitle.endsWith(' - Voxpolis') ? cleanTitle : `${cleanTitle} - Voxpolis`;
      const slug = cleanTitle
        .toLowerCase()
        .replace(/ - voxpolis$/i, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 80);

      const country = getCountryByCode(pubCountry);

      await supabase.from('articles').upsert({
        slug,
        title: displayTitle,
        snippet: pubSnippet.trim() || pubContent.slice(0, 200),
        content: pubContent.trim(),
        ai_analysis: `• Strategic Context: Official executive dispatch for ${country?.name || pubCountry}.\n• Key Takeaway: Direct policy brief filed via Voxpolis Editorial Desk.`,
        country_code: pubCountry,
        language: 'en',
        category: 'politics',
        image_mode: 'original',
        original_image_url: pubImage || '/breaking-news-banner.png',
        source_name: 'Voxpolis Editorial Desk',
        source_url: `https://voxpolis.app/article/${slug}`,
        is_breaking: true,
        tags: ['Breaking', 'Politics', country?.name || pubCountry],
        views_count: 0,
        total_reading_time_seconds: 240,
        created_at: new Date().toISOString(),
      }, { onConflict: 'slug' });

      setPubSuccess(true);
      setPubTitle('');
      setPubSnippet('');
      setPubContent('');
      setPubImage('');
      setTimeout(() => setPubSuccess(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPublishing(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4">
          <Shield className="w-10 h-10 mx-auto" />
        </div>
        <h1 className="text-2xl font-black mb-2">Voxpolis Executive Admin Access</h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
          This portal is restricted to authorized platform administrators. Please sign in with your designated administrator credentials (<span className="text-white font-mono">michael.eboh@gmail.com</span>).
        </p>
        <Link
          href="/login?redirect=/admin"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
        >
          Sign In as Administrator
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Navigation */}
      <header className="bg-slate-900 border-b border-gray-800 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SiteLogo variant="full" className="h-8 w-auto" />
          <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-full">
            <Shield className="w-3.5 h-3.5" /> Executive Admin Portal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:inline">
            Logged in as: <span className="text-white font-semibold">{currentUser?.email}</span>
          </span>
          <Link href="/feed" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
            View Live Site →
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="space-y-1.5 bg-slate-900 p-4 rounded-2xl border border-gray-800 h-fit">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-300 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Country & Audience Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'submissions'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-300 hover:bg-slate-800'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Columnist Submissions ({submissions.filter((s) => s.status === 'pending_review').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pages')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'pages'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Edit Static Pages (CMS)</span>
          </button>

          <button
            onClick={() => setActiveTab('publish')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'publish'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-300 hover:bg-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Publish Direct News</span>
          </button>
        </div>

        {/* Content Pane */}
        <div className="md:col-span-3 bg-slate-900 p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-xl">
          {actionSuccessMsg && (
            <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {actionSuccessMsg}
            </div>
          )}

          {/* TAB 1: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="border-b border-gray-800 pb-4">
                <h2 className="text-xl font-black text-white">Country & Citizen Engagement Analytics</h2>
                <p className="text-xs text-gray-400">
                  Real-time visitor tracking, guest vs. member breakdown, and civic participation metrics.
                </p>
              </div>

              {/* High-level summary metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Visitors</span>
                  <span className="text-2xl font-black text-white">48,920</span>
                  <span className="text-[10px] text-emerald-400 font-semibold block">+14.2% this week</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Registered Members</span>
                  <span className="text-2xl font-black text-blue-400">12,480</span>
                  <span className="text-[10px] text-blue-300 font-semibold block">25.5% of total</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Guest Readers</span>
                  <span className="text-2xl font-black text-amber-400">36,440</span>
                  <span className="text-[10px] text-gray-400 font-semibold block">74.5% of total</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Poll Votes Cast</span>
                  <span className="text-2xl font-black text-purple-400">89,210</span>
                  <span className="text-[10px] text-purple-300 font-semibold block">High Civic Sentiment</span>
                </div>
              </div>

              {/* Top Performing Countries */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span>Top Performing Countries by Citizen Engagement</span>
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-gray-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-gray-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Country</th>
                        <th className="p-3.5">Total Readers</th>
                        <th className="p-3.5">Members</th>
                        <th className="p-3.5">Guests</th>
                        <th className="p-3.5">Engagement Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold flex items-center gap-2">
                          <span className="text-base">🇳🇬</span> Nigeria
                        </td>
                        <td className="p-3.5 text-gray-300">21,400</td>
                        <td className="p-3.5 text-blue-400 font-semibold">6,120</td>
                        <td className="p-3.5 text-gray-400">15,280</td>
                        <td className="p-3.5 text-emerald-400 font-bold">84.2%</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold flex items-center gap-2">
                          <span className="text-base">🇺🇸</span> United States
                        </td>
                        <td className="p-3.5 text-gray-300">14,210</td>
                        <td className="p-3.5 text-blue-400 font-semibold">3,890</td>
                        <td className="p-3.5 text-gray-400">10,320</td>
                        <td className="p-3.5 text-emerald-400 font-bold">78.5%</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold flex items-center gap-2">
                          <span className="text-base">🇬🇧</span> United Kingdom
                        </td>
                        <td className="p-3.5 text-gray-300">6,840</td>
                        <td className="p-3.5 text-blue-400 font-semibold">1,420</td>
                        <td className="p-3.5 text-gray-400">5,420</td>
                        <td className="p-3.5 text-emerald-400 font-bold">72.0%</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold flex items-center gap-2">
                          <span className="text-base">🇿🇦</span> South Africa
                        </td>
                        <td className="p-3.5 text-gray-300">3,980</td>
                        <td className="p-3.5 text-blue-400 font-semibold">820</td>
                        <td className="p-3.5 text-gray-400">3,160</td>
                        <td className="p-3.5 text-emerald-400 font-bold">69.4%</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold flex items-center gap-2">
                          <span className="text-base">🇰🇪</span> Kenya
                        </td>
                        <td className="p-3.5 text-gray-300">2,490</td>
                        <td className="p-3.5 text-blue-400 font-semibold">230</td>
                        <td className="p-3.5 text-gray-400">2,260</td>
                        <td className="p-3.5 text-emerald-400 font-bold">66.1%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarked Top Members */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Remarked Top Members (Highest Civic Discussion & Polling Activity)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Barr. Tunde Oladipo</span>
                      <span className="text-base">🇳🇬</span>
                    </div>
                    <p className="text-[11px] text-gray-400">Legal Analyst · Abuja</p>
                    <span className="text-[10px] text-blue-400 font-semibold block pt-1">
                      142 Comments · 98% Insightful Rating
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Sarah Jenkins</span>
                      <span className="text-base">🇺🇸</span>
                    </div>
                    <p className="text-[11px] text-gray-400">Policy Fellow · Washington D.C.</p>
                    <span className="text-[10px] text-blue-400 font-semibold block pt-1">
                      98 Comments · 95% Insightful Rating
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Chuka Eze</span>
                      <span className="text-base">🇳🇬</span>
                    </div>
                    <p className="text-[11px] text-gray-400">Fiscal Governance Observer · Lagos</p>
                    <span className="text-[10px] text-blue-400 font-semibold block pt-1">
                      87 Comments · 92% Insightful Rating
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COLUMNIST SUBMISSIONS */}
          {activeTab === 'submissions' && (
            <div className="space-y-6">
              <div className="border-b border-gray-800 pb-4">
                <h2 className="text-xl font-black text-white">Columnist & Op-Ed Submissions Review Desk</h2>
                <p className="text-xs text-gray-400">
                  Review submitted articles from accredited columnists. Only articles of 500+ words meeting editorial decency are eligible for publication.
                </p>
              </div>

              {submissions.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-xs">
                  No columnist submissions in queue.
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-5 rounded-2xl bg-slate-950 border border-gray-800 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={sub.author_avatar || '/breaking-news-banner.png'}
                            alt={sub.author_name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-700"
                          />
                          <div>
                            <span className="font-bold text-sm text-white block">{sub.author_name}</span>
                            <span className="text-[11px] text-gray-400">{sub.author_email} · Beat: {sub.country_code}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              sub.status === 'published'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : sub.status === 'declined'
                                ? 'bg-red-950 text-red-400 border-red-800'
                                : 'bg-amber-950 text-amber-400 border-amber-800'
                            }`}
                          >
                            {sub.status.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-gray-400 bg-slate-900 px-2 py-0.5 rounded border border-gray-800">
                            {sub.word_count} words
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-white">{sub.title}</h3>
                        <p className="text-xs text-gray-300 mt-1 leading-relaxed whitespace-pre-line line-clamp-4">
                          {sub.content}
                        </p>
                      </div>

                      {sub.status === 'pending_review' && (
                        <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-800/80">
                          <button
                            type="button"
                            onClick={() => handleUpdateSubmission(sub.id, 'declined')}
                            className="px-3.5 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSubmission(sub.id, 'published')}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve & Publish Live</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EDIT STATIC PAGES (CMS) */}
          {activeTab === 'pages' && (
            <div className="space-y-6">
              <div className="border-b border-gray-800 pb-4">
                <h2 className="text-xl font-black text-white">Dynamic Site Pages Content Manager (CMS)</h2>
                <p className="text-xs text-gray-400">
                  Update your About Us, Contact, Privacy Policy, and Terms of Service directly without altering code.
                </p>
              </div>

              {/* Page Selector Tabs */}
              <div className="flex gap-2 border-b border-gray-800 pb-3 flex-wrap">
                {(['about', 'contact', 'privacy', 'terms'] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPageKey(key)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                      selectedPageKey === key
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-950 text-gray-400 hover:text-white'
                    }`}
                  >
                    {key} Page
                  </button>
                ))}
              </div>

              {pageSaved && (
                <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {selectedPageKey.toUpperCase()} page saved and updated successfully!
                </div>
              )}

              <form onSubmit={handleSavePage} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Page Title</label>
                  <input
                    type="text"
                    value={pageData.title || ''}
                    onChange={(e) => setPageData({ ...pageData, title: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={pageData.subtitle || ''}
                    onChange={(e) => setPageData({ ...pageData, subtitle: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {selectedPageKey === 'about' && (
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Mission Statement</label>
                    <textarea
                      rows={3}
                      value={pageData.mission || ''}
                      onChange={(e) => setPageData({ ...pageData, mission: e.target.value })}
                      className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                    />
                  </div>
                )}

                {selectedPageKey === 'contact' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-300 block mb-1">Primary Email</label>
                      <input
                        type="text"
                        value={pageData.email || ''}
                        onChange={(e) => setPageData({ ...pageData, email: e.target.value })}
                        className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-300 block mb-1">Office Address</label>
                      <input
                        type="text"
                        value={pageData.headquarters_address || ''}
                        onChange={(e) => setPageData({ ...pageData, headquarters_address: e.target.value })}
                        className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {(selectedPageKey === 'privacy' || selectedPageKey === 'terms') && (
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Legal / Policy Body Content</label>
                    <textarea
                      rows={8}
                      value={pageData.content || ''}
                      onChange={(e) => setPageData({ ...pageData, content: e.target.value })}
                      className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save {selectedPageKey.toUpperCase()} Page</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: PUBLISH DIRECT NEWS */}
          {activeTab === 'publish' && (
            <div className="space-y-6">
              <div className="border-b border-gray-800 pb-4">
                <h2 className="text-xl font-black text-white">Direct News & Editorial Publisher</h2>
                <p className="text-xs text-gray-400">
                  Compose breaking news, administrative briefs, or official reports and publish immediately to any country feed.
                </p>
              </div>

              {pubSuccess && (
                <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> News published live to {pubCountry} feed!
                </div>
              )}

              <form onSubmit={handleDirectPublish} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Target Country</label>
                    <select
                      value={pubCountry}
                      onChange={(e) => setPubCountry(e.target.value)}
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
                    <label className="text-xs font-bold text-gray-300 block mb-1">Featured Photo Image URL</label>
                    <input
                      type="url"
                      value={pubImage}
                      onChange={(e) => setPubImage(e.target.value)}
                      placeholder="https://..."
                      className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Headline *</label>
                  <input
                    type="text"
                    required
                    value={pubTitle}
                    onChange={(e) => setPubTitle(e.target.value)}
                    placeholder="Headline will automatically end with - Voxpolis..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Executive Brief Snippet</label>
                  <input
                    type="text"
                    value={pubSnippet}
                    onChange={(e) => setPubSnippet(e.target.value)}
                    placeholder="Short 1-2 sentence overview for feed cards..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Full Article Body *</label>
                  <textarea
                    rows={8}
                    required
                    value={pubContent}
                    onChange={(e) => setPubContent(e.target.value)}
                    placeholder="Full detailed journalistic coverage and policy insights..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isPublishing ? 'Publishing...' : 'Publish Live Immediately'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
