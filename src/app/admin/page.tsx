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
  Vote,
  MessageSquare,
  UserCheck,
  ExternalLink,
  Trash2,
  PlusCircle,
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

  const [activeTab, setActiveTab] = useState<'analytics' | 'published' | 'publish' | 'submissions' | 'pages' | 'logos'>('analytics');

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

  // Real Database Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState(false);
  const [lastAnalyticsSync, setLastAnalyticsSync] = useState<Date | null>(null);

  // Published News Articles State
  const [publishedArticles, setPublishedArticles] = useState<any[]>([]);
  const [isLoadingPublished, setIsLoadingPublished] = useState(true);
  const [publishedCountryFilter, setPublishedCountryFilter] = useState('ALL');
  const [lastPublishedResult, setLastPublishedResult] = useState<any>(null);

  // Admin Image Upload State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fetchLiveAnalytics = async (isManual = false) => {
    if (isManual) setIsRefreshingAnalytics(true);
    try {
      const res = await fetch('/api/admin/analytics', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAnalyticsData(data);
          setLastAnalyticsSync(new Date());
        }
      }
    } catch (err) {
      console.warn('Failed to load real analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
      if (isManual) setIsRefreshingAnalytics(false);
    }
  };

  const fetchPublishedArticles = async () => {
    setIsLoadingPublished(true);
    try {
      const res = await fetch('/api/admin/articles', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.articles) setPublishedArticles(data.articles);
      }
    } catch (e) {
      console.warn('Failed to load published articles:', e);
    } finally {
      setIsLoadingPublished(false);
    }
  };

  useEffect(() => {
    fetchLiveAnalytics();
    fetchPublishedArticles();
    // Real-time polling every 20 seconds
    const interval = setInterval(() => {
      fetchLiveAnalytics();
      fetchPublishedArticles();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

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

  const handleAdminImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          setPubImage(data.imageUrl);
        } else {
          setUploadError('Failed to obtain image URL');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.error || 'Image upload failed');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Image upload failed');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove and unpublish "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/articles?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setPublishedArticles((prev) => prev.filter((a) => a.id !== id));
        setActionSuccessMsg(`Article "${title}" removed from live database.`);
        setTimeout(() => setActionSuccessMsg(''), 4000);
        fetchLiveAnalytics();
      }
    } catch (e) {
      console.error('Delete article error:', e);
    }
  };

  const handleUpdateSubmission = async (id: string, newStatus: 'published' | 'declined') => {
    try {
      const item = submissions.find((s) => s.id === id);
      if (newStatus === 'published' && item) {
        // Publish to Supabase via server admin API
        const res = await fetch('/api/admin/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            snippet: item.snippet || item.content.slice(0, 200),
            content: item.content,
            country_code: item.country_code,
            image_url: item.featured_image_url,
            category: 'opinion',
            is_breaking: false,
            tags: ['Op-Ed', 'Column', item.country_code, item.author_name],
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || 'Failed to publish columnist submission');
          return;
        }
      }

      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
      setActionSuccessMsg(`Article ${newStatus === 'published' ? 'approved and published live on Voxpolis' : 'declined'}.`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
      fetchPublishedArticles();
      fetchLiveAnalytics();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDirectPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    setPubSuccess(false);
    setLastPublishedResult(null);

    try {
      const countryObj = getCountryByCode(pubCountry);
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pubTitle,
          snippet: pubSnippet,
          content: pubContent,
          country_code: pubCountry,
          image_url: pubImage,
          category: 'politics',
          is_breaking: true,
          tags: ['Breaking', 'Politics', countryObj?.name || pubCountry, 'Voxpolis'],
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPubSuccess(true);
        setLastPublishedResult(data);
        setPubTitle('');
        setPubSnippet('');
        setPubContent('');
        setPubImage('');
        // Immediately refresh published list and analytics
        fetchPublishedArticles();
        fetchLiveAnalytics();
      } else {
        alert(data.error || 'Failed to publish article');
      }
    } catch (e: any) {
      console.error('Publish error:', e);
      alert('Error publishing article: ' + e.message);
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
          <Link href="/" title="Voxpolis Home">
            <SiteLogo variant="full" className="h-8 w-auto hover:opacity-90 transition" />
          </Link>
          <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-full">
            <Shield className="w-3.5 h-3.5" /> Executive Admin Portal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:inline">
            Logged in as: <span className="text-white font-semibold">{currentUser?.email}</span>
          </span>
          <Link href="/news" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
            View Live News →
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
            onClick={() => setActiveTab('published')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition text-left ${
              activeTab === 'published'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-300 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Published News ({publishedArticles.length})</span>
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
            <span>Guest & Columnist Submissions ({submissions.length})</span>
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

          {/* TAB 1: ANALYTICS (100% REAL DATABASE DATA) */}
          {activeTab === 'analytics' && (
            <div className="space-y-8">
              {/* Header with live sync indicator */}
              <div className="border-b border-gray-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-black text-white tracking-tight">Real Database & Citizen Analytics</h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-700/60 text-[10px] font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live DB Connected
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Direct real-time metrics pulled from Supabase Auth & PostgreSQL tables. Zero demo or simulated numbers.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {lastAnalyticsSync && (
                    <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
                      Synced {lastAnalyticsSync.toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={() => fetchLiveAnalytics(true)}
                    disabled={isRefreshingAnalytics}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-gray-700 text-xs font-bold text-gray-200 transition active:scale-95 disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRefreshingAnalytics ? 'animate-spin text-blue-400' : 'text-gray-400'}`} />
                    <span>{isRefreshingAnalytics ? 'Syncing...' : 'Refresh Live DB'}</span>
                  </button>
                </div>
              </div>

              {/* High-level summary metrics (4 Real Database Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* 1. Registered Citizens */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Registered Citizens</span>
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="text-2xl font-black text-blue-400">
                    {isLoadingAnalytics ? '...' : (analyticsData?.metrics?.totalMembers ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-blue-300 font-medium block">
                    {analyticsData?.members?.byCountry?.length || 0} sovereign nations represented
                  </span>
                </div>

                {/* 2. Active Political News */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Political News</span>
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-2xl font-black text-white">
                    {isLoadingAnalytics ? '...' : (analyticsData?.metrics?.totalNewsCount ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium block">
                    {analyticsData?.metrics?.databaseArticlesCount || 0} DB custom + 119 country desks
                  </span>
                </div>

                {/* 3. Citizen Poll Votes */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Poll Votes Cast</span>
                    <Vote className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <span className="text-2xl font-black text-purple-400">
                    {isLoadingAnalytics ? '...' : (analyticsData?.metrics?.totalPollVotes ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-purple-300 font-medium block">
                    Real ballots logged in database
                  </span>
                </div>

                {/* 4. Citizen Comments */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Citizen Comments</span>
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="text-2xl font-black text-amber-400">
                    {isLoadingAnalytics ? '...' : (analyticsData?.metrics?.totalComments ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-amber-300 font-medium block">
                    {analyticsData?.metrics?.totalReactions || 0} reactions · {analyticsData?.metrics?.totalFeedback || 0} feedback
                  </span>
                </div>
              </div>

              {/* SECTION: SIGNED-UP MEMBERS & THEIR COUNTRIES (REAL-TIME LIVE ROSTER) */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>Signed-Up Members & Country Breakdown</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Live roster of verified citizens pulled in real-time from Supabase Auth and Profiles table.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 bg-blue-950/80 border border-blue-800 text-blue-300 font-bold rounded-lg">
                      {analyticsData?.members?.total || 0} Registered Citizens
                    </span>
                  </div>
                </div>

                {/* Country distribution pills/cards */}
                {analyticsData?.members?.byCountry && analyticsData.members.byCountry.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {analyticsData.members.byCountry.map((item: any) => (
                      <div
                        key={item.countryCode}
                        className="p-3 bg-slate-950 rounded-2xl border border-gray-800 flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{item.flag}</span>
                          <div>
                            <div className="text-xs font-bold text-white line-clamp-1">{item.countryName}</div>
                            <div className="text-[10px] text-gray-400 font-mono font-bold">{item.countryCode}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-blue-400">{item.memberCount}</span>
                          <span className="text-[9px] text-gray-500 font-semibold block">{item.percentage}% share</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Member Directory Table */}
                <div className="overflow-x-auto rounded-2xl border border-gray-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-gray-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Citizen / Member</th>
                        <th className="p-3.5">Email Address</th>
                        <th className="p-3.5">Country of Residence</th>
                        <th className="p-3.5">Auth Provider</th>
                        <th className="p-3.5">Role</th>
                        <th className="p-3.5 text-right">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {isLoadingAnalytics ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                            Loading verified member directory from database...
                          </td>
                        </tr>
                      ) : !analyticsData?.members?.list || analyticsData.members.list.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-500">
                            No registered members found in Supabase Auth yet.
                          </td>
                        </tr>
                      ) : (
                        analyticsData.members.list.map((member: any) => (
                          <tr key={member.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-bold">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-900/60 border border-blue-700/60 flex items-center justify-center text-blue-300 font-black text-xs shrink-0 overflow-hidden">
                                  {member.avatar ? (
                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                  ) : (
                                    (member.name?.[0] || 'U').toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div className="text-white font-semibold flex items-center gap-1.5">
                                    <span>{member.name}</span>
                                    {member.isAdmin && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800 font-bold">
                                        Super Admin
                                      </span>
                                    )}
                                  </div>
                                  {member.username && (
                                    <div className="text-[10px] text-gray-400 font-mono">@{member.username}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 font-mono text-gray-300 text-[11px] whitespace-nowrap">
                              {member.email}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-200">
                                <span>{member.flag}</span>
                                <span>{member.countryName}</span>
                                <span className="text-[10px] text-gray-400 font-mono font-normal">({member.countryCode})</span>
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="text-gray-300 font-medium">
                                {member.provider}
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              {member.isAdmin ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                                  Admin
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                                  Verified Citizen
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-right font-mono text-gray-400 text-[11px] whitespace-nowrap">
                              {new Date(member.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: NEWS COUNT BY COUNTRY DESK (REAL CATALOG) */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Active Political News Catalog by Country Desk</span>
                  </h3>
                  <span className="text-[11px] text-gray-400 font-medium">
                    119 sovereign country desks monitored 24/7
                  </span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-gray-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-gray-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3.5">Country Desk</th>
                        <th className="p-3.5">Seat of Government</th>
                        <th className="p-3.5 text-right">Active Political Stories</th>
                        <th className="p-3.5 text-right">Desk Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {analyticsData?.news?.byCountry?.map((c: any) => (
                        <tr key={c.countryCode} className="hover:bg-slate-800/40 transition">
                          <td className="p-3.5 font-bold flex items-center gap-2.5">
                            <span className="text-base">{c.flag}</span>
                            <span className="text-white">{c.countryName}</span>
                            <span className="text-[10px] text-gray-500 font-mono">({c.countryCode})</span>
                          </td>
                          <td className="p-3.5 text-gray-400">{c.capital}</td>
                          <td className="p-3.5 text-right font-black text-white">{c.newsCount}</td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarked Real Members */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Remarked Active Members (Live Supabase Registry)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {analyticsData?.members?.list?.slice(0, 3).map((m: any) => (
                    <div key={m.id} className="p-4 rounded-2xl bg-slate-950 border border-gray-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{m.name}</span>
                        <span className="text-base">{m.flag}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-mono truncate">{m.email}</p>
                      <span className="text-[10px] text-blue-400 font-semibold block pt-1">
                        {m.isAdmin ? 'Platform Administrator' : 'Verified Registered Citizen'} · via {m.provider}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Page & Article Views Breakdown by Country */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                      <Globe2 className="w-4 h-4 text-emerald-400" />
                      <span>Live Article Reads Breakdown by Country</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Real-time reader telemetry differentiating anonymous guest readers from signed-in civic members.
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
                      <option value="ALL">🌍 All Countries</option>
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
                        <th className="p-3.5">Page / Article Title</th>
                        <th className="p-3.5">Country</th>
                        <th className="p-3.5 text-right">Total Reads</th>
                        <th className="p-3.5 text-right">Members</th>
                        <th className="p-3.5 text-right">Guests</th>
                        <th className="p-3.5 text-right">Last Read</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {analyticsData?.traffic?.recentReads && analyticsData.traffic.recentReads.length > 0 ? (
                        analyticsData.traffic.recentReads
                          .filter(
                            (item: any) =>
                              analyticsCountryFilter === 'ALL' || item.code === analyticsCountryFilter
                          )
                          .map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/40 transition">
                              <td className="p-3.5">
                                <div className="font-semibold text-white line-clamp-1">{row.title}</div>
                                <span className="text-[10px] font-mono text-gray-400">/news/{row.slug}</span>
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                                  <span>{row.flag}</span>
                                  <span>{row.country}</span>
                                </span>
                              </td>
                              <td className="p-3.5 text-right font-bold text-white whitespace-nowrap">
                                {row.totalReads.toLocaleString()}
                              </td>
                              <td className="p-3.5 text-right whitespace-nowrap">
                                <span className="text-blue-400 font-semibold">{row.memberReads.toLocaleString()}</span>
                              </td>
                              <td className="p-3.5 text-right whitespace-nowrap">
                                <span className="text-amber-400 font-semibold">{row.guestReads.toLocaleString()}</span>
                              </td>
                              <td className="p-3.5 text-right text-gray-400 whitespace-nowrap font-mono text-[11px]">
                                {new Date(row.lastReadAt).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            <Eye className="w-5 h-5 mx-auto mb-2 text-gray-500" />
                            <div className="font-semibold text-gray-300">No article reads recorded yet in this session</div>
                            <div className="text-[11px] text-gray-500 mt-1 max-w-md mx-auto">
                              Live tracking is active across all 119 country desks. Reads will increment automatically here when visitors and registered members view articles.
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GUEST & COLUMNIST SUBMISSIONS */}
          {activeTab === 'submissions' && (
            <div className="space-y-6">
              <div className="border-b border-gray-800 pb-4">
                <h2 className="text-xl font-black text-white">Guest & Columnist Submissions Review Desk</h2>
                <p className="text-xs text-gray-400">
                  Review and moderate submitted op-eds and guest citizen articles. Approving an article immediately publishes it live to the target country feed under Voxpolis.
                </p>
              </div>

              {submissions.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-xs">
                  No guest or columnist submissions in queue yet.
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

          {/* TAB 3: PUBLISH DIRECT NEWS */}
          {activeTab === 'publish' && (
            <div className="space-y-6">
              <div className="border-b border-gray-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">Direct News & Editorial Publisher</h2>
                  <p className="text-xs text-gray-400">
                    Publish official breaking news and policy briefs directly to national feeds as official Voxpolis reporting. Every article published here appears live under source <span className="text-blue-400 font-semibold">Voxpolis</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('published')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto border border-gray-700 shrink-0"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>View All Published News ({publishedArticles.length})</span>
                </button>
              </div>

              {/* Success Feedback Card with Instant Live Links */}
              {pubSuccess && lastPublishedResult && (
                <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Article successfully published live to the Voxpolis database and national news space!</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link
                      href={lastPublishedResult.liveUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition"
                    >
                      <span>View Live Article ({lastPublishedResult.liveUrl})</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/${lastPublishedResult.countrySlug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-bold rounded-xl transition border border-gray-700"
                    >
                      <span>View on Country Feed (/{lastPublishedResult.countrySlug})</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              <form onSubmit={handleDirectPublish} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Target Country *</label>
                    <select
                      value={pubCountry}
                      onChange={(e) => setPubCountry(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ALL_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Image Upload & Preview Section */}
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-1">Featured Article Photo</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow transition active:scale-95 shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingImage ? 'Uploading Image...' : 'Upload Image'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingImage}
                            onChange={handleAdminImageUpload}
                            className="hidden"
                          />
                        </label>
                        <input
                          type="url"
                          value={pubImage}
                          onChange={(e) => setPubImage(e.target.value)}
                          placeholder="Or paste image URL (https://...)"
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                      </div>

                      {uploadError && (
                        <p className="text-[11px] text-red-400 font-medium">{uploadError}</p>
                      )}

                      {pubImage && (
                        <div className="relative inline-flex items-center gap-3 p-2 bg-slate-950 border border-gray-800 rounded-xl">
                          <img
                            src={pubImage}
                            alt="Article Photo Preview"
                            className="h-16 w-24 object-cover rounded-lg border border-gray-700"
                          />
                          <div className="space-y-1">
                            <span className="text-[10px] text-emerald-400 font-bold block flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Photo Attached
                            </span>
                            <button
                              type="button"
                              onClick={() => setPubImage('')}
                              className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                            >
                              Remove photo
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Headline *</label>
                  <input
                    type="text"
                    required
                    value={pubTitle}
                    onChange={(e) => setPubTitle(e.target.value)}
                    placeholder="e.g. Syria Security Council Reaches Historic Border Accord..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Executive Brief Snippet</label>
                  <input
                    type="text"
                    value={pubSnippet}
                    onChange={(e) => setPubSnippet(e.target.value)}
                    placeholder="Short 1-2 sentence overview for feed cards (optional, auto-generated if left empty)..."
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
                    placeholder="Write the full journalistic report, executive statements, and diplomatic analysis..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isPublishing ? 'Publishing to Live Database...' : 'Publish Live to Voxpolis Immediately'}</span>
                  </button>
                </div>
              </form>

              {/* Quick Roster of Recently Published Articles */}
              <div className="pt-6 border-t border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Recently Published Articles by Voxpolis</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('published')}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    View All ({publishedArticles.length}) →
                  </button>
                </div>

                {publishedArticles.length === 0 ? (
                  <div className="p-6 bg-slate-950 rounded-2xl border border-gray-800 text-center text-xs text-gray-500">
                    No articles published yet. Use the form above to publish your first story.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-gray-400 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3.5">Headline</th>
                          <th className="p-3.5">Country</th>
                          <th className="p-3.5">Source</th>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {publishedArticles.slice(0, 5).map((art) => (
                          <tr key={art.id || art.slug} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-bold text-white">
                              <div className="line-clamp-1">{art.title}</div>
                              <span className="text-[10px] text-gray-500 font-mono">/news/{art.slug}</span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 text-xs text-gray-200">
                                <span>{art.country_flag}</span>
                                <span>{art.country_name}</span>
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                                {art.source_name || 'Voxpolis'}
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap text-gray-400 font-mono text-[11px]">
                              {new Date(art.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <Link
                                href={art.live_url}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-bold"
                              >
                                <span>View Live</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PUBLISHED NEWS & ARTICLES MANAGER */}
          {activeTab === 'published' && (
            <div className="space-y-6">
              <div className="border-b border-gray-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">Published News & Articles Manager</h2>
                  <p className="text-xs text-gray-400">
                    Live database registry of all articles published by Voxpolis. Every article here is active live across national feeds.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('publish')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Publish New Story</span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchPublishedArticles}
                    disabled={isLoadingPublished}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl transition border border-gray-700"
                    title="Refresh list"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isLoadingPublished ? 'animate-spin text-blue-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400 font-semibold">Filter by Country:</span>
                  <select
                    value={publishedCountryFilter}
                    onChange={(e) => setPublishedCountryFilter(e.target.value)}
                    className="text-xs py-1.5 px-3 bg-slate-950 border border-gray-800 text-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ALL">🌍 All Countries</option>
                    {ALL_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  {publishedArticles.filter((a) => publishedCountryFilter === 'ALL' || a.country_code === publishedCountryFilter).length} Articles Found
                </span>
              </div>

              {/* Full Published Table */}
              <div className="overflow-x-auto rounded-2xl border border-gray-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-gray-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Headline & Slug</th>
                      <th className="p-3.5">Country</th>
                      <th className="p-3.5">Source</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Views</th>
                      <th className="p-3.5">Date Published</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {isLoadingPublished ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400">
                          <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                          Loading published stories from database...
                        </td>
                      </tr>
                    ) : publishedArticles.filter((a) => publishedCountryFilter === 'ALL' || a.country_code === publishedCountryFilter).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          No published articles found for this filter. Click &ldquo;Publish New Story&rdquo; to publish an article.
                        </td>
                      </tr>
                    ) : (
                      publishedArticles
                        .filter((a) => publishedCountryFilter === 'ALL' || a.country_code === publishedCountryFilter)
                        .map((art) => (
                          <tr key={art.id || art.slug} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 font-bold text-white max-w-xs">
                              <Link
                                href={art.live_url}
                                target="_blank"
                                className="line-clamp-1 hover:text-blue-400 transition"
                              >
                                {art.title}
                              </Link>
                              <span className="text-[10px] text-gray-500 font-mono block">/news/{art.slug}</span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 text-xs text-gray-200">
                                <span>{art.country_flag}</span>
                                <span>{art.country_name}</span>
                                <span className="text-[10px] text-gray-500 font-mono">({art.country_code})</span>
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                                {art.source_name || 'Voxpolis'}
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                                Live On Site
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-mono text-gray-300 font-semibold whitespace-nowrap">
                              {art.views_count.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                              {new Date(art.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={art.live_url}
                                  target="_blank"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold rounded-lg border border-gray-700 transition"
                                >
                                  <span>View</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteArticle(art.id, art.title)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-400 text-xs font-bold rounded-lg border border-red-800 transition"
                                  title="Delete and unpublish from database"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
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
                        Voxpolis — Concise & Factual Global News
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
                        Voxpolis — Concise & Factual Global News
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
