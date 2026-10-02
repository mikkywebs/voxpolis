'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/branding/SiteLogo';
import { getGroupedRegions, CountryConfig, getCountryByCode, ALL_COUNTRIES } from '@/config/countries';
import { Check, ArrowRight, ChevronDown, Search, User, ShieldCheck } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [primaryCountry, setPrimaryCountry] = useState<string>('NG'); // Default to Nigeria
  const [followedCountries, setFollowedCountries] = useState<string[]>([]);
  const [preferredLanguage, setPreferredLanguage] = useState<string>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>({
    'West Africa': true,
    'North America': true,
  });

  const allRegionGroups = useMemo(() => getGroupedRegions(), []);
  const primaryObj = getCountryByCode(primaryCountry);

  // Load existing profile or OAuth metadata
  useEffect(() => {
    async function loadUser() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (user) {
          const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
          const metaUsername = user.user_metadata?.username || (user.email ? user.email.split('@')[0] : '');
          if (metaName) setFullName(metaName);
          if (metaUsername) setUsername(metaUsername);

          // Fetch from Supabase profiles if exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username, country_code')
            .eq('id', user.id)
            .single();

          if (profile?.full_name) setFullName(profile.full_name);
          if (profile?.username) setUsername(profile.username);
          if (profile?.country_code) setPrimaryCountry(profile.country_code);
        } else {
          // Check localStorage
          const localName = localStorage.getItem('voxpolis_user_name') || '';
          const localUsername = localStorage.getItem('voxpolis_username') || '';
          const localCountry = localStorage.getItem('voxpolis_primary_country') || 'NG';
          if (localName) setFullName(localName);
          if (localUsername) setUsername(localUsername);
          if (localCountry) setPrimaryCountry(localCountry);
        }
      } catch {}
    }
    loadUser();
  }, []);

  const toggleRegion = (regionName: string) => {
    setOpenRegions((prev) => ({
      ...prev,
      [regionName]: !prev[regionName],
    }));
  };

  const toggleFollowed = (code: string) => {
    if (code === primaryCountry) return;
    if (followedCountries.includes(code)) {
      setFollowedCountries(followedCountries.filter((c) => c !== code));
    } else {
      if (followedCountries.length < 2) {
        setFollowedCountries([...followedCountries, code]);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();

      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: fullName.trim() || user.email?.split('@')[0] || 'Member',
          username: cleanUsername || (user.email?.split('@')[0] || 'citizen'),
          country_code: primaryCountry,
          updated_at: new Date().toISOString(),
        });
      }

      if (fullName) localStorage.setItem('voxpolis_user_name', fullName.trim());
      if (cleanUsername) localStorage.setItem('voxpolis_username', cleanUsername);
      localStorage.setItem('voxpolis_primary_country', primaryCountry);
      localStorage.setItem('voxpolis_followed_countries', JSON.stringify(followedCountries));
      localStorage.setItem('voxpolis_preferred_language', preferredLanguage);

      router.push('/feed');
    } catch (e) {
      console.error('Error saving profile:', e);
      router.push('/feed');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allRegionGroups;

    return allRegionGroups
      .map((g) => {
        const matches = g.countries.filter(
          (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.region.toLowerCase().includes(q)
        );
        if (matches.length === 0) return null;
        return { ...g, countries: matches };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [allRegionGroups, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto w-full space-y-6 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl">
        <div className="text-center">
          <SiteLogo variant="full" className="h-10 w-auto mx-auto mb-3" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">
            Complete Your Member Profile
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Personalize your identity and select your primary country feed across 119 regions.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Step 1: Member Civic Identity (Name + Preferred Username, Zero Phone Numbers) */}
          <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                1. Citizen Identity Details
              </h3>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
              Your name and preferred handle are displayed with your verified country flag ({primaryObj.flag}) when you participate in discussions. No phone numbers are ever required.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Barr. Tunde Oladipo"
                    className="w-full text-xs p-2.5 pl-8 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <User className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Preferred Username *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. tunde_law"
                    className="w-full text-xs p-2.5 pl-7 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-gray-400 font-bold text-xs absolute left-2.5 top-2.5">@</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Regional Grouped Accordion List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider block">
                2. Select Primary Country Feed *
              </label>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Selected: {primaryObj.flag} {primaryObj.name}
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 119 countries (e.g., Ghana, Kenya, UK, Nigeria)..."
                className="w-full text-xs p-2.5 pl-9 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 p-2 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50">
              {filteredGroups.map((group) => {
                const isExpanded = searchQuery ? true : !!openRegions[group.regionName];
                return (
                  <div
                    key={group.regionName}
                    className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-800/60"
                  >
                    <button
                      type="button"
                      onClick={() => toggleRegion(group.regionName)}
                      className="w-full flex items-center justify-between p-2.5 px-3 bg-gray-100/60 dark:bg-gray-800 hover:bg-gray-200/60 text-left text-xs font-bold text-gray-900 dark:text-white"
                    >
                      <span className="flex items-center gap-2">
                        <span>{group.icon}</span>
                        <span>{group.regionName}</span>
                        <span className="text-[10px] text-gray-400">({group.countries.length})</span>
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {group.countries.map((c) => {
                          const isSelected = primaryCountry === c.code;
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setPrimaryCountry(c.code);
                                setFollowedCountries(followedCountries.filter((code) => code !== c.code));
                                if (c.languages.length > 0) {
                                  setPreferredLanguage(c.languages[0].code);
                                }
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                                  : 'bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-blue-50'
                              }`}
                            >
                              <span className="flex items-center gap-1.5 truncate">
                                <span className="text-sm">{c.flag}</span>
                                <span className="truncate">{c.name}</span>
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Follow Up To 2 Additional Countries */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider block">
              3. Follow Additional Countries (Optional, max 2)
            </label>
            <div className="flex items-center gap-2 flex-wrap max-h-28 overflow-y-auto p-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/40">
              {ALL_COUNTRIES.filter((c) => c.code !== primaryCountry).map((c) => {
                const isFollowed = followedCountries.includes(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => toggleFollowed(c.code)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
                      isFollowed
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-emerald-50'
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

          {/* Save CTA */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <span>{isSaving ? 'Saving Profile...' : `Complete Profile & Enter ${primaryObj.name} Feed`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
