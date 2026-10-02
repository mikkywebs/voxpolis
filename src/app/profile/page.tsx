'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';
import { ALL_COUNTRIES, CountryConfig, getCountryByCode, getCountrySlug } from '@/config/countries';
import { getMemberBadge } from '@/lib/badges';
import { ArrowLeft, User, ShieldCheck, Mail, Globe, Save, CheckCircle2, AlertCircle, Sparkles, Award, Lock } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Profile fields
  const [initialName, setInitialName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [primaryCountry, setPrimaryCountry] = useState('NG');
  const [memberSince, setMemberSince] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;

        if (user) {
          setEmail(user.email || '');
          const metaName = user.user_metadata?.full_name || '';
          const metaUsername = user.user_metadata?.username || (user.email ? user.email.split('@')[0] : '');
          const metaInitial = user.user_metadata?.initial_name || metaName || '';
          const metaCountry = user.user_metadata?.primary_country || 'NG';
          const metaSince = user.created_at || user.user_metadata?.member_since || null;

          setInitialName(metaInitial);
          setDisplayName(metaName);
          setUsername(metaUsername);
          setPrimaryCountry(metaCountry);
          setMemberSince(metaSince);

          // Fetch from Supabase profiles table
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, primary_country, email, created_at')
              .eq('id', user.id)
              .single();

            if (profile) {
              if (profile.full_name) setDisplayName(profile.full_name);
              if (profile.primary_country) setPrimaryCountry(profile.primary_country);
              if (profile.email) setEmail(profile.email);
              if (profile.created_at) setMemberSince(profile.created_at);
            }
          } catch {}
        } else {
          // Fallback to localStorage
          const localName = localStorage.getItem('voxpolis_user_name') || '';
          const localUsername = localStorage.getItem('voxpolis_username') || '';
          const localInitial = localStorage.getItem('voxpolis_initial_name') || localName;
          const localCountry = localStorage.getItem('voxpolis_primary_country') || 'NG';
          const localSince = localStorage.getItem('voxpolis_member_since') || new Date().toISOString();

          setInitialName(localInitial);
          setDisplayName(localName);
          setUsername(localUsername);
          setPrimaryCountry(localCountry);
          setMemberSince(localSince);
        }
      } catch (e) {
        console.warn('Error loading profile:', e);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const cleanUname = username.replace(/^@/, '').trim().toLowerCase();
      const cleanName = displayName.trim();

      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;

      if (user) {
        // 1. Update Supabase Auth user_metadata
        await supabase.auth.updateUser({
          data: {
            full_name: cleanName,
            username: cleanUname,
            primary_country: primaryCountry,
            initial_name: initialName || cleanName,
          },
        });

        // 2. Update public.profiles table
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: cleanName,
          primary_country: primaryCountry,
          updated_at: new Date().toISOString(),
        });
      }

      // 3. Update localStorage cache
      localStorage.setItem('voxpolis_user_name', cleanName);
      localStorage.setItem('voxpolis_username', cleanUname);
      localStorage.setItem('voxpolis_primary_country', primaryCountry);
      if (initialName) localStorage.setItem('voxpolis_initial_name', initialName);

      setSuccessMsg('Profile details successfully updated and saved!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const { badge, daysActive, progressPercent } = getMemberBadge(memberSince);
  const countryObj = getCountryByCode(primaryCountry);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 py-10 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${getCountrySlug(countryObj)}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to {countryObj.flag} {countryObj.name} Newsroom</span>
          </Link>

          <Link href="/feed">
            <SiteLogo variant="full" className="h-8 w-auto" />
          </Link>
        </div>

        {/* Member Badge & Milestone Achievement Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-tr from-blue-900 via-indigo-950 to-slate-900 text-white border border-blue-800/60 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-3xl shadow-inner">
                {badge.icon}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider border border-blue-400/20">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Civic Standing: {badge.shortLabel}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black mt-0.5">
                  {displayName || 'Citizen Member'}
                </h1>
                <p className="text-xs text-blue-200/80 font-mono">
                  @{username || 'member'} • Member for {daysActive} {daysActive === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl">{countryObj.flag}</span>
              <p className="text-[11px] text-gray-300 font-semibold">{countryObj.name}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <p className="text-xs italic text-blue-100 leading-relaxed">
              "{badge.quote}"
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-blue-200">
                <span>Progress to {badge.nextBadgeName || 'Master Statesman'}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Profile Settings Form */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-md space-y-6">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Member Identity & Settings
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Manage your display name, username, and country newsroom. Initial registration name is archived for authenticity.
            </p>
          </div>

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* Locked Initial Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Initial Registered Name (Permanent)</span>
                </label>
                <span className="text-[10px] text-gray-400">Locked at Registration</span>
              </div>
              <input
                type="text"
                disabled
                value={initialName || displayName}
                className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed font-medium"
              />
            </div>

            {/* Editable Display Name */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Display Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your public display name"
                  className="w-full text-xs p-3 pl-9 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Editable Username */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Preferred Username Handle *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username_handle"
                  className="w-full text-xs p-3 pl-8 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <span className="text-gray-400 font-bold text-xs absolute left-3 top-3">@</span>
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Registered Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full text-xs p-3 pl-9 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Primary Country Desk Selector */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Primary Country Newsroom *
              </label>
              <div className="relative">
                <select
                  value={primaryCountry}
                  onChange={(e) => setPrimaryCountry(e.target.value)}
                  className="w-full text-xs p-3 pl-9 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
