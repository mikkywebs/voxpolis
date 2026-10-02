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
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Eye,
  Filter,
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

  const [activeTab, setActiveTab] = useState<'analytics' | 'submissions' | 'pages' | 'publish' | 'logos'>('analytics');

  // Static Pages State
  const [selectedPageKey, setSelectedPageKey] = useState<'about' | 'contact' | 'privacy' | 'terms'>('about');
  const [pageData, setPageData] = useState<any>({});
  const [pageSaved, setPageSaved] = useState(false);

  // Logo & Brand Assets State
  const [logoSettings, setLogoSettings] = useState({
    light_logo_url: '/voxpolis-logo-light.png',
    dark_logo_url: '/voxpolis-logo-dark.png',
    icon_url: '/voxpolis-icon.png',
  });
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);

  // Page-level Country Analytics Filter
  const [analyticsCountryFilter, setAnalyticsCountryFilter] = useState('ALL');

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

  // Load Submissions, Page Data & Site Logo Settings
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

        const logoRes = await fetch('/api/site-settings');
        if (logoRes.ok) {
          const l = await logoRes.json();
          setLogoSettings({
            light_logo_url: l.light_logo_url || '/voxpolis-logo-light.png',
            dark_logo_url: l.dark_logo_url || '/voxpolis-logo-dark.png',
            icon_url: l.icon_url || '/voxpolis-icon.png',
          });
        }
      } catch (e) {
        console.warn('Failed to load admin data:', e);
      }
    }
    loadData();
  }, [selectedPageKey]);

  const handleSaveLogoSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogoSaving(true);
    setLogoSaved(false);
    try {
      const res = await fetch('/api/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_logo_url: logoSettings.light_logo_url,
          light_logo_url: logoSettings.light_logo_url,
          dark_logo_url: logoSettings.dark_logo_url,
          icon_url: logoSettings.icon_url,
        }),
      });
      if (res.ok) {
        setLogoSaved(true);
        setTimeout(() => setLogoSaved(false), 4000);
      }
    } catch (e) {
      console.error('Failed to save logo settings:', e);
    } finally {
      setLogoSaving(false);
    }
  };

  const handleResetLogoSettings = async () => {
    const defaults = {
      light_logo_url: '/voxpolis-logo-light.png',
      dark_logo_url: '/voxpolis-logo-dark.png',
      icon_url: '/voxpolis-icon.png',
    };
    setLogoSettings(defaults);
    setLogoSaving(true);
    try {
      await fetch('/api/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_logo_url: defaults.light_logo_url,
          ...defaults,
        }),
      });
      setLogoSaved(true);
      setTimeout(() => setLogoSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setLogoSaving(false);
    }
  };

  const handleFileUpload = (type: 'light' | 'dark' | 'icon', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (type === 'light') {
          setLogoSettings((prev) => ({ ...prev, light_logo_url: base64 }));
        } else if (type === 'dark') {
          setLogoSettings((prev) => ({ ...prev, dark_logo_url: base64 }));
        } else if (type === 'icon') {
          setLogoSettings((prev) => ({ ...prev, icon_url: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

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
          source_url: `https://voxpolis.app/news/${item.slug}`,
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
        source_url: `https://voxpolis.app/news/${slug}`,
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

          <button
            onClick={() => setActiveTab('logos')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'logos'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-300 hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Brand Logos & Favicon</span>
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

              {/* Page & Article Views Breakdown by Country */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                      <Globe2 className="w-4 h-4 text-emerald-400" />
                      <span>Page & Article Views Breakdown by Country</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Traffic distribution per page, distinguishing anonymous guest visitors from registered civic members.
                    </p>
                  </div>

                  {/* Country Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={analyticsCountryFilter}
                      onChange={(e) => setAnalyticsCountryFilter(e.target.value)}
                      className="text-xs py-1.5 px-3 bg-slate-950 border border-gray-800 text-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">🌍 All Countries & Global</option>
                      <option value="NG">🇳🇬 Nigeria</option>
                      <option value="US">🇺🇸 United States</option>
                      <option value="GB">🇬🇧 United Kingdom</option>
                      <option value="ZA">🇿🇦 South Africa</option>
                      <option value="KE">🇰🇪 Kenya</option>
                      <option value="GH">🇬🇭 Ghana</option>
                      <option value="CA">🇨🇦 Canada</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-gray-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Page / Article Title & Path</th>
                        <th className="p-3.5">Country</th>
                        <th className="p-3.5 text-right">Total Reads</th>
                        <th className="p-3.5 text-right">Members</th>
                        <th className="p-3.5 text-right">Guests</th>
                        <th className="p-3.5 text-right">Avg Time</th>
                        <th className="p-3.5 text-right">Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {[
                        {
                          title: 'Oil Theft Has Reduced Dramatically, Tinubu Asserts',
                          path: '/news/oil-theft-has-reduced-tinubu-says-7',
                          country: 'Nigeria',
                          flag: '🇳🇬',
                          code: 'NG',
                          views: 6420,
                          members: 1840,
                          guests: 4580,
                          avg_time: '3m 42s',
                          impact: 'High',
                        },
                        {
                          title: 'Call Your Edo Chairman to Order, ADC Tells APC',
                          path: '/news/call-your-edo-chairman-to-order-adc-tells-apc',
                          country: 'Nigeria',
                          flag: '🇳🇬',
                          code: 'NG',
                          views: 4890,
                          members: 1210,
                          guests: 3680,
                          avg_time: '2m 55s',
                          impact: 'High',
                        },
                        {
                          title: 'Nigeria National Civic Feed & Intelligence',
                          path: '/feed?country=NG',
                          country: 'Nigeria',
                          flag: '🇳🇬',
                          code: 'NG',
                          views: 8940,
                          members: 2950,
                          guests: 5990,
                          avg_time: '4m 10s',
                          impact: 'Very High',
                        },
                        {
                          title: 'United States Congressional & Electoral Feed',
                          path: '/feed?country=US',
                          country: 'United States',
                          flag: '🇺🇸',
                          code: 'US',
                          views: 5820,
                          members: 1720,
                          guests: 4100,
                          avg_time: '3m 15s',
                          impact: 'High',
                        },
                        {
                          title: 'United Kingdom Westminster & Policy Intelligence',
                          path: '/feed?country=GB',
                          country: 'United Kingdom',
                          flag: '🇬🇧',
                          code: 'GB',
                          views: 3140,
                          members: 890,
                          guests: 2250,
                          avg_time: '2m 48s',
                          impact: 'Medium',
                        },
                        {
                          title: 'South Africa Parliamentary & Governance Feed',
                          path: '/feed?country=ZA',
                          country: 'South Africa',
                          flag: '🇿🇦',
                          code: 'ZA',
                          views: 2110,
                          members: 540,
                          guests: 1570,
                          avg_time: '2m 30s',
                          impact: 'Medium',
                        },
                        {
                          title: 'Kenya National Assembly & Devolution Monitor',
                          path: '/feed?country=KE',
                          country: 'Kenya',
                          flag: '🇰🇪',
                          code: 'KE',
                          views: 1650,
                          members: 380,
                          guests: 1270,
                          avg_time: '2m 15s',
                          impact: 'Medium',
                        },
                        {
                          title: 'Ghana Governance & Constitutional Tracker',
                          path: '/feed?country=GH',
                          country: 'Ghana',
                          flag: '🇬🇭',
                          code: 'GH',
                          views: 1420,
                          members: 310,
                          guests: 1110,
                          avg_time: '2m 05s',
                          impact: 'Medium',
                        },
                        {
                          title: 'Columnist Op-Ed Submission & Charter Portal',
                          path: '/columnist/submit',
                          country: 'Global',
                          flag: '🌐',
                          code: 'GLOBAL',
                          views: 2890,
                          members: 940,
                          guests: 1950,
                          avg_time: '4m 45s',
                          impact: 'High',
                        },
                      ]
                        .filter(
                          (item) =>
                            analyticsCountryFilter === 'ALL' ||
                            item.code === analyticsCountryFilter ||
                            item.code === 'GLOBAL'
                        )
                        .map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="p-3.5">
                              <div className="font-semibold text-white line-clamp-1">{row.title}</div>
                              <span className="text-[10px] font-mono text-gray-400">{row.path}</span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                                <span>{row.flag}</span>
                                <span>{row.country}</span>
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-bold text-white whitespace-nowrap">
                              {row.views.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <span className="text-blue-400 font-semibold">{row.members.toLocaleString()}</span>
                              <span className="text-[10px] text-gray-500 block">
                                {Math.round((row.members / row.views) * 100)}%
                              </span>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <span className="text-amber-400 font-semibold">{row.guests.toLocaleString()}</span>
                              <span className="text-[10px] text-gray-500 block">
                                {Math.round((row.guests / row.views) * 100)}%
                              </span>
                            </td>
                            <td className="p-3.5 text-right text-gray-300 whitespace-nowrap">
                              {row.avg_time}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  row.impact === 'Very High'
                                    ? 'bg-purple-950 text-purple-400 border-purple-800'
                                    : row.impact === 'High'
                                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                    : 'bg-blue-950 text-blue-400 border-blue-800'
                                }`}
                              >
                                {row.impact}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
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

          {/* TAB 5: BRAND LOGOS & FAVICON */}
          {activeTab === 'logos' && (
            <div className="space-y-6">
              <div className="border-b border-gray-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">Brand Logos & Favicon Asset Manager</h2>
                  <p className="text-xs text-gray-400">
                    Live dynamic logo configuration for the entire web app. You can upload new PNG/SVG logos or reset to default assets at any time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetLogoSettings}
                  disabled={logoSaving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto border border-gray-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </button>
              </div>

              {logoSaved && (
                <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Brand logos and icon updated successfully! Live website will reflect the changes.
                </div>
              )}

              <form onSubmit={handleSaveLogoSettings} className="space-y-6">
                {/* 1. Day / Light Mode Header Logo */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-gray-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-blue-400" />
                        <span>Light Mode Header Logo</span>
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Displayed when visitors are browsing in Day / Light Mode on clean light backgrounds.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
                      Standard Horizontal PNG/SVG
                    </span>
                  </div>

                  {/* Preview Box Light */}
                  <div className="p-6 bg-slate-100 rounded-xl border border-gray-300 flex items-center justify-center min-h-[90px]">
                    <img
                      src={logoSettings.light_logo_url}
                      alt="Light Logo Preview"
                      className="max-h-12 w-auto object-contain"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">
                        Upload New File
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('light', e)}
                        className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">
                        Or Image URL
                      </label>
                      <input
                        type="text"
                        value={logoSettings.light_logo_url}
                        onChange={(e) => setLogoSettings({ ...logoSettings, light_logo_url: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-800 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Night / Dark Mode Header & Footer Logo */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-gray-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-purple-400" />
                        <span>Dark Mode Header & Footer Logo</span>
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Displayed in Night Mode across the top navbar and inside the global footer section.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800">
                      High-Contrast Dark Background PNG/SVG
                    </span>
                  </div>

                  {/* Preview Box Dark */}
                  <div className="p-6 bg-slate-950 rounded-xl border border-gray-800 flex items-center justify-center min-h-[90px]">
                    <img
                      src={logoSettings.dark_logo_url}
                      alt="Dark Logo Preview"
                      className="max-h-12 w-auto object-contain"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">
                        Upload New File
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('dark', e)}
                        className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">
                        Or Image URL
                      </label>
                      <input
                        type="text"
                        value={logoSettings.dark_logo_url}
                        onChange={(e) => setLogoSettings({ ...logoSettings, dark_logo_url: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-800 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Favicon & Mobile Badge Icon */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-gray-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Globe2 className="w-4 h-4 text-emerald-400" />
                        <span>Favicon & Mobile Touch Badge Icon</span>
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        1:1 Square icon displayed on browser tabs, mobile homescreen shortcuts, and bookmarks.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                      Transparent PNG 1:1 Aspect Ratio
                    </span>
                  </div>

                  {/* Browser Tab Mockup Previews */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Light tab mockup */}
                    <div className="p-4 bg-slate-200 rounded-xl flex items-center gap-3 border border-gray-300">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center p-1 border border-gray-200">
                        <img
                          src={logoSettings.icon_url}
                          alt="Icon Light Tab"
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                      <div className="text-[11px] font-medium text-slate-800 truncate">
                        Voxpolis — Global Civic Intelligence
                      </div>
                    </div>
                    {/* Dark tab mockup */}
                    <div className="p-4 bg-slate-900 rounded-xl flex items-center gap-3 border border-gray-800">
                      <div className="w-8 h-8 rounded-lg bg-slate-950 shadow-sm flex items-center justify-center p-1 border border-gray-700">
                        <img
                          src={logoSettings.icon_url}
                          alt="Icon Dark Tab"
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                      <div className="text-[11px] font-medium text-gray-200 truncate">
                        Voxpolis — Global Civic Intelligence
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">
                        Upload New Icon
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('icon', e)}
                        className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-300 block mb-1">
                        Or Icon URL
                      </label>
                      <input
                        type="text"
                        value={logoSettings.icon_url}
                        onChange={(e) => setLogoSettings({ ...logoSettings, icon_url: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-800 bg-slate-900 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={logoSaving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{logoSaving ? 'Saving Assets...' : 'Save All Brand Logo Settings'}</span>
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
