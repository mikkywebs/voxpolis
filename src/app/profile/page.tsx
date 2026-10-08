'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';
import { ALL_COUNTRIES, CountryConfig, getCountryByCode, getCountrySlug } from '@/config/countries';
import { getMemberBadge } from '@/lib/badges';
import { ArrowLeft, ArrowRight, User, ShieldCheck, Mail, Globe, Save, CheckCircle2, AlertCircle, Sparkles, Award, Lock, Check, Search, X, ChevronDown } from 'lucide-react';

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
  const [followedCountries, setFollowedCountries] = useState<string[]>([]);
  const [memberSince, setMemberSince] = useState<string | null>(null);

  // Searchable Country Typeahead States
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [followedSearchQuery, setFollowedSearchQuery] = useState('');
  const countryPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryPickerRef.current && !countryPickerRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          const metaFollowed = user.user_metadata?.followed_countries || [];
          const metaSince = user.created_at || user.user_metadata?.member_since || null;

          setInitialName(metaInitial);
          setDisplayName(metaName);
          setUsername(metaUsername);
          setPrimaryCountry(metaCountry);
          if (Array.isArray(metaFollowed)) setFollowedCountries(metaFollowed);
          setMemberSince(metaSince);

          // Fetch from Supabase profiles table
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, primary_country, followed_countries, email, created_at')
              .eq('id', user.id)
              .single();

            if (profile) {
              if (profile.full_name) setDisplayName(profile.full_name);
              if (profile.primary_country) setPrimaryCountry(profile.primary_country);
              if (Array.isArray(profile.followed_countries)) setFollowedCountries(profile.followed_countries);
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
          let localFollowed: string[] = [];
          try {
            const parsed = JSON.parse(localStorage.getItem('voxpolis_followed_countries') || '[]');
            if (Array.isArray(parsed)) localFollowed = parsed;
          } catch {}
          const localSince = localStorage.getItem('voxpolis_member_since') || new Date().toISOString();

          setInitialName(localInitial);
          setDisplayName(localName);
          setUsername(localUsername);
          setPrimaryCountry(localCountry);
          setFollowedCountries(localFollowed);
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

  const toggleFollowed = (code: string) => {
    if (code === primaryCountry) return;
    if (followedCountries.includes(code)) {
      setFollowedCountries(followedCountries.filter((c) => c !== code));
    } else {
      if (followedCountries.length < 5) {
        setFollowedCountries([...followedCountries, code]);
      }
    }
  };

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
            followed_countries: followedCountries,
            initial_name: initialName || cleanName,
          },
        });

        // 2. Update public.profiles table
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: cleanName,
          primary_country: primaryCountry,
          followed_countries: followedCountries,
          updated_at: new Date().toISOString(),
        });
      }

      // 3. Update localStorage cache
      localStorage.setItem('voxpolis_user_name', cleanName);
      localStorage.setItem('voxpolis_username', cleanUname);
      localStorage.setItem('voxpolis_primary_country', primaryCountry);
      localStorage.setItem('voxpolis_followed_countries', JSON.stringify(followedCountries));
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

  const filteredPrimaryCountries = ALL_COUNTRIES.filter((c) => {
    if (!countrySearchQuery.trim()) return true;
    const q = countrySearchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      getCountrySlug(c).toLowerCase().includes(q) ||
      (c.capital && c.capital.toLowerCase().includes(q))
    );
  });

  const filteredFollowedCountries = ALL_COUNTRIES.filter((c) => {
    if (c.code === primaryCountry) return false;
    if (!followedSearchQuery.trim()) return true;
    const q = followedSearchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      getCountrySlug(c).toLowerCase().includes(q) ||
      (c.capital && c.capital.toLowerCase().includes(q))
    );
  });

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

          <Link href="/">
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
                <span>Progress to {badge.nextBadgeName || 'Statesman'}</span>
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

            {/* Primary Country Desk Selector with Typeahead Search */}
            <div ref={countryPickerRef} className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                  Primary Country Newsroom *
                </label>
                <Link
                  href={`/${getCountrySlug(countryObj)}`}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Open {countryObj.flag} {countryObj.name} Feed</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Active Selected Country Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{countryObj.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {countryObj.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-600 text-white">
                        {countryObj.code}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      Capital: {countryObj.capital || 'National'} • Active National Newsroom
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition flex items-center gap-1 shadow-sm"
                >
                  <span>{isCountryDropdownOpen ? 'Close List' : 'Change Country'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Searchable Input & Floating Results Dropdown */}
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={countrySearchQuery}
                    onFocus={() => setIsCountryDropdownOpen(true)}
                    onChange={(e) => {
                      setCountrySearchQuery(e.target.value);
                      setIsCountryDropdownOpen(true);
                    }}
                    placeholder="Type country name or code to search (e.g. Syria, Nigeria, France)..."
                    className="w-full text-xs p-3 pl-9 pr-9 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                  {countrySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCountrySearchQuery('')}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Floating Suggestions List when open */}
                {isCountryDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl divide-y divide-gray-100 dark:divide-gray-800">
                    <div className="p-2 bg-gray-50 dark:bg-gray-800/80 sticky top-0 z-10 flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400 px-3">
                      <span>Matching Countries ({filteredPrimaryCountries.length})</span>
                      <span className="text-[10px] font-normal">Click country to select</span>
                    </div>

                    {filteredPrimaryCountries.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
                        No countries found matching &ldquo;{countrySearchQuery}&rdquo;. Try another name or code.
                      </div>
                    ) : (
                      filteredPrimaryCountries.map((c) => {
                        const isSelected = c.code === primaryCountry;
                        return (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setPrimaryCountry(c.code);
                              setCountrySearchQuery('');
                              setIsCountryDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition hover:bg-blue-50 dark:hover:bg-blue-950/60 ${
                              isSelected
                                ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{c.flag}</span>
                              <div>
                                <span className="font-semibold text-xs block">{c.name}</span>
                                <span className="text-[10px] text-gray-400 font-normal">
                                  {c.capital ? `${c.capital} • ` : ''}Code: {c.code}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                {c.code}
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Followed Countries for My VoxPolis (Up to 5) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                  Followed Countries for My VoxPolis (Choose up to 5)
                </label>
                <span className="text-[10px] text-gray-400 font-semibold">{followedCountries.length} of 5 selected</span>
              </div>

              {/* Quick filter input for followed countries */}
              <div className="relative">
                <input
                  type="text"
                  value={followedSearchQuery}
                  onChange={(e) => setFollowedSearchQuery(e.target.value)}
                  placeholder="Type to filter countries to follow..."
                  className="w-full text-xs p-2 pl-8 pr-7 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
                {followedSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setFollowedSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap max-h-36 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                {filteredFollowedCountries.map((c) => {
                  const isFollowed = followedCountries.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => toggleFollowed(c.code)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                        isFollowed
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400'
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                      {isFollowed && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
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
