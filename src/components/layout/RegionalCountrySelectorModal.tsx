'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getGroupedRegions, CountryConfig, Continent } from '@/config/countries';
import { Search, ChevronDown, X, Globe, Check } from 'lucide-react';

interface RegionalCountrySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountry: CountryConfig;
  onSelectCountry: (country: CountryConfig) => void;
}

export default function RegionalCountrySelectorModal({
  isOpen,
  onClose,
  selectedCountry,
  onSelectCountry,
}: RegionalCountrySelectorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeContinent, setActiveContinent] = useState<Continent | 'All'>('All');
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({
    'West Africa': true,
    'North America': true,
    'Western/Northern Europe': true,
    'East Asia': true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key to close modal instantly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const allRegionGroups = useMemo(() => getGroupedRegions(), []);

  const toggleRegion = (regionName: string) => {
    setExpandedRegions((prev) => ({
      ...prev,
      [regionName]: !prev[regionName],
    }));
  };

  // Filter logic: Filter by continent tab and live search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return allRegionGroups
      .map((group) => {
        // Filter continent
        if (activeContinent !== 'All' && group.continent !== activeContinent) {
          return null;
        }

        // Filter search query
        if (!q) return group;

        const matchingCountries = group.countries.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.region.toLowerCase().includes(q)
        );

        if (matchingCountries.length === 0) return null;

        return {
          ...group,
          countries: matchingCountries,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [allRegionGroups, activeContinent, searchQuery]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      {/* Backdrop with direct click to exit */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto cursor-pointer"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()} // Stop click propagation inside modal
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden cursor-default my-auto"
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/80 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
                  Select Country & Region
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                  Switch political coverage between 119 countries
                </p>
              </div>
            </div>

            {/* Prominent Easy Exit Button */}
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="px-4 sm:px-5 pt-3 pb-2 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 119 countries (e.g. Nigeria, Ghana, United States)..."
                className="w-full text-xs p-3 pl-10 pr-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Continent Filter Tabs */}
          <div className="px-4 sm:px-5 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['All', 'Africa', 'Americas', 'Europe', 'Asia'] as const).map((tab) => {
              const countMap: Record<string, number> = {
                All: 119,
                Africa: 33,
                Americas: 25,
                Europe: 31,
                Asia: 30,
              };
              const isSelected = activeContinent === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveContinent(tab)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab === 'All' ? '🌐 All' : tab} ({countMap[tab]})
                </button>
              );
            })}
          </div>

          {/* Region Accordions List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredGroups.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500">
                No matching countries found for &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isExpanded = searchQuery ? true : !!expandedRegions[group.regionName];
                return (
                  <div
                    key={group.regionName}
                    className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-800/40 shadow-sm"
                  >
                    {/* Region Header Accordion Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleRegion(group.regionName)}
                      className="w-full flex items-center justify-between p-3 sm:px-4 bg-gray-50/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{group.icon}</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {group.regionName}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          {group.countries.length}
                        </span>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </button>

                    {/* Region Countries Grid */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {group.countries.map((c) => {
                              const isSelected = selectedCountry.code === c.code;
                              return (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    onSelectCountry(c);
                                    onClose();
                                  }}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-600 shadow'
                                      : 'bg-gray-50 dark:bg-gray-900/60 text-gray-800 dark:text-gray-200 border-gray-200/80 dark:border-gray-700/80 hover:bg-blue-50 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <span className="text-base">{c.flag}</span>
                                    <span className="truncate">{c.name}</span>
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
