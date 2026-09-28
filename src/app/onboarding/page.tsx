'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/branding/SiteLogo';
import { getGroupedRegions, CountryConfig, getCountryByCode, ALL_COUNTRIES } from '@/config/countries';
import { Check, ArrowRight, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingPage() {
  const router = useRouter();

  const [primaryCountry, setPrimaryCountry] = useState<string>('NG'); // Default to Nigeria or US
  const [followedCountries, setFollowedCountries] = useState<string[]>([]);
  const [preferredLanguage, setPreferredLanguage] = useState<string>('en');
  const [searchQuery, setSearchQuery] = useState('');

  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>({
    'West Africa': true,
    'North America': true,
  });

  const allRegionGroups = useMemo(() => getGroupedRegions(), []);
  const primaryObj = getCountryByCode(primaryCountry);

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

  const handleSave = () => {
    localStorage.setItem('voxpolis_primary_country', primaryCountry);
    localStorage.setItem('voxpolis_followed_countries', JSON.stringify(followedCountries));
    localStorage.setItem('voxpolis_preferred_language', preferredLanguage);

    router.push('/feed');
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
            Select Your Primary Country & Regions
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Choose your home country feed from 119 regional options arranged by continent.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 119 countries (e.g., Ghana, Kenya, UK)..."
            className="w-full text-xs p-3 pl-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        </div>

        {/* Step 1: Regional Grouped Accordion List */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider block">
            1. Select Primary Country *
          </label>

          <div className="max-h-72 overflow-y-auto space-y-2.5 p-2 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50">
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

        {/* Step 2: Language Preference (If primary country supports multiple) */}
        {primaryObj.languages.length > 1 && (
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider block">
              2. Preferred Language ({primaryObj.name})
            </label>
            <div className="flex gap-2">
              {primaryObj.languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setPreferredLanguage(l.code)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                    preferredLanguage === l.code
                      ? 'bg-blue-600 text-white border-blue-600 shadow'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Follow Up To 2 Additional Countries */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider block">
            3. Follow Additional Countries (Optional, max 2)
          </label>
          <div className="flex items-center gap-2 flex-wrap max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/40">
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
          onClick={handleSave}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
        >
          <span>Save Preferences ({primaryObj.flag} {primaryObj.name})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
