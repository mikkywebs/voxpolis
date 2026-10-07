'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SiteLogo from '@/components/branding/SiteLogo';
import RegionalCountrySelectorModal from '@/components/layout/RegionalCountrySelectorModal';
import AuthPromptModal from '@/components/auth/AuthPromptModal';
import MilestoneAchievementModal from '@/components/profile/MilestoneAchievementModal';
import { CountryConfig, SUPPORTED_COUNTRIES, getCountrySlug } from '@/config/countries';
import { WeatherData } from '@/lib/weather';
import { Sun, Moon, PenTool, ChevronDown, User, Shield, LogOut, Languages, Globe, Check } from 'lucide-react';

interface HeaderProps {
  user?: {
    id: string;
    email?: string;
    fullName?: string;
    primaryCountry?: string;
    isAdmin?: boolean;
  } | null;
  selectedCountry: CountryConfig;
  onSelectCountry: (country: CountryConfig) => void;
  selectedLanguage?: string;
  onSelectLanguage?: (lang: string) => void;
}

export default function Header({
  user,
  selectedCountry,
  onSelectCountry,
  selectedLanguage = 'en',
  onSelectLanguage,
}: HeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(user || null);
  const [greeting, setGreeting] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accentColor, setAccentColor] = useState<'blue' | 'emerald' | 'purple' | 'amber' | 'rose'>('blue');
  const [memberSince, setMemberSince] = useState<string | null>(null);

  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Seamless country switcher: saves preferences and opens the dedicated country landing page
  const handleCountrySelect = (c: CountryConfig) => {
    setIsCountryDropdownOpen(false);
    setIsModalOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('voxpolis_primary_country', c.code);
      if (c.languages?.length > 0) {
        localStorage.setItem('voxpolis_preferred_language', c.languages[0].code);
      }
    }
    if (onSelectCountry) {
      onSelectCountry(c);
    }
    const slug = getCountrySlug(c);
    router.push(`/${slug}`);
  };

  // Auto-resolve user session if not passed as prop or on session change
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }

    let authListener: any = null;
    async function resolveAuth() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user;

        const localName = localStorage.getItem('voxpolis_user_name');
        const localEmail = localStorage.getItem('voxpolis_user_email');
        const localActive = localStorage.getItem('voxpolis_session_active') === 'true';

        if (sessionUser) {
          const name = sessionUser.user_metadata?.full_name || localName || sessionUser.email?.split('@')[0] || 'Citizen';
          setCurrentUser({
            id: sessionUser.id,
            email: sessionUser.email,
            fullName: name,
            primaryCountry: sessionUser.user_metadata?.primary_country || 'NG',
            isAdmin: sessionUser.email?.toLowerCase() === 'michael.eboh@gmail.com',
          });
        } else if (localActive || localName) {
          setCurrentUser({
            id: 'local-member',
            fullName: localName || 'Citizen',
            email: localEmail || undefined,
            primaryCountry: localStorage.getItem('voxpolis_primary_country') || 'NG',
          });
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          const u = session?.user;
          if (u) {
            const name = u.user_metadata?.full_name || localStorage.getItem('voxpolis_user_name') || u.email?.split('@')[0] || 'Citizen';
            setCurrentUser({
              id: u.id,
              email: u.email,
              fullName: name,
              primaryCountry: u.user_metadata?.primary_country || 'NG',
              isAdmin: u.email?.toLowerCase() === 'michael.eboh@gmail.com',
            });
          } else if (!localStorage.getItem('voxpolis_session_active')) {
            setCurrentUser(null);
          }
        });
        authListener = sub?.subscription;
      } catch (e) {
        const localName = localStorage.getItem('voxpolis_user_name');
        if (localName) {
          setCurrentUser({
            id: 'local-member',
            fullName: localName,
            primaryCountry: 'NG',
          });
        }
      }
    }
    resolveAuth();

    return () => {
      if (authListener) authListener.unsubscribe();
    };
  }, [user]);

  // Compute time-of-day greeting and load member registration date
  useEffect(() => {
    const hour = new Date().getHours();
    let timeOfDay = 'day';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 18) timeOfDay = 'afternoon';
    else timeOfDay = 'evening';

    const name = currentUser?.fullName || (currentUser?.email ? currentUser.email.split('@')[0] : 'Guest');
    setGreeting(`Good ${timeOfDay}, ${name}`);

    const storedSince = localStorage.getItem('voxpolis_member_since');
    if (storedSince) {
      setMemberSince(storedSince);
    }
  }, [currentUser]);

  // Fetch weather for selected country capital
  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await fetch(`/api/weather?lat=${selectedCountry.lat}&lon=${selectedCountry.lon}`);
        if (res.ok) {
          const data = await res.json();
          setWeather(data);
        }
      } catch (e) {
        console.warn('Weather fetch error:', e);
      }
    }
    loadWeather();
  }, [selectedCountry]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const cycleAccentColor = () => {
    const colors: Array<'blue' | 'emerald' | 'purple' | 'amber' | 'rose'> = [
      'blue',
      'emerald',
      'purple',
      'amber',
      'rose',
    ];
    const nextIndex = (colors.indexOf(accentColor) + 1) % colors.length;
    const nextColor = colors[nextIndex];
    setAccentColor(nextColor);
    document.documentElement.setAttribute('data-accent', nextColor);
  };

  const activeLangObj = selectedCountry.languages.find((l) => l.code === selectedLanguage) || selectedCountry.languages[0];

  // Quick Top Countries for fast access in desktop dropdown
  const QUICK_COUNTRIES = SUPPORTED_COUNTRIES.slice(0, 8);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Branding Logo, About Link & Greeting */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <SiteLogo variant="full" className="h-8 sm:h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-3 border-l border-gray-200 dark:border-gray-700 pl-3 py-1 text-xs font-semibold">
            <Link href="/about" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
              About Us
            </Link>
            <span className="hidden lg:inline text-gray-300 dark:text-gray-700">•</span>
            <span className="hidden lg:inline font-medium text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{greeting}</span>
          </nav>
        </div>

        {/* Right: Weather Chip, Regional Country Switcher Dropdown, Language Toggle, Theme & User */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Weather Chip (Controlled width so it never crowds header elements) */}
          {weather && (
            <div className="hidden sm:flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
              <span>{weather.icon}</span>
              <span>{weather.tempC}°C</span>
              <span className="hidden lg:inline text-gray-400 truncate max-w-[90px]">| {weather.condition}</span>
            </div>
          )}

          {/* Regional Country Selector Trigger & Dropdown Menu */}
          <div className="relative shrink-0" ref={countryDropdownRef}>
            <button
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              type="button"
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-blue-300 dark:border-gray-600 shadow-sm transition cursor-pointer shrink-0"
              title="Select Country Coverage"
            >
              <span className="text-base leading-none">{selectedCountry.flag}</span>
              <span className="font-bold">{selectedCountry.code}</span>
              <span className="hidden md:inline font-semibold">{selectedCountry.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Desktop Quick Country Dropdown */}
            {isCountryDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 py-2 text-xs">
                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                  <span className="font-extrabold text-[11px] text-gray-400 uppercase tracking-wider">
                    Quick Country Switch
                  </span>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">
                    119 Nations
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                  {QUICK_COUNTRIES.map((c) => {
                    const isSelected = selectedCountry.code === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleCountrySelect(c)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between font-medium hover:bg-blue-50 dark:hover:bg-gray-700 transition ${
                          isSelected ? 'bg-blue-50/70 dark:bg-gray-700/70 text-blue-600 font-bold' : 'text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="text-base">{c.flag}</span>
                          <span className="truncate">{c.name}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="p-2 border-t border-gray-100 dark:border-gray-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCountryDropdownOpen(false);
                      setIsModalOpen(true);
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Explore All 119 Countries...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Country Recognized Language Switcher */}
          {selectedCountry.languages.length > 1 && (
            <div className="relative shrink-0">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-xs font-bold text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700 transition"
                title="Change Country Recognized Language"
              >
                <Languages className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="uppercase">{activeLangObj?.code || 'EN'}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {selectedCountry.name} Languages
                  </div>
                  {selectedCountry.languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        if (onSelectLanguage) onSelectLanguage(l.code);
                        setIsLangOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center justify-between ${
                        selectedLanguage === l.code
                          ? 'text-blue-600 font-bold bg-blue-50/50 dark:bg-gray-700/50'
                          : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <span>{l.name}</span>
                      <span className="uppercase text-[10px] text-gray-400">{l.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Write Op-Ed Button */}
          <Link
            href="/columnist/submit"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition shrink-0"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Write Op-Ed</span>
          </Link>

          {/* Night/Day Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            title="Toggle Dark/Light Mode"
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition shrink-0"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile / Auth Links */}
          {currentUser ? (
            <div className="relative shrink-0">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow">
                  {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1 text-xs">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{currentUser.fullName || 'User'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{currentUser.email}</p>
                  </div>
                  {(currentUser.isAdmin || (currentUser.email && currentUser.email.toLowerCase() === 'michael.eboh@gmail.com')) && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-amber-600 dark:text-amber-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                  >
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>My Profile & Badges</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left font-medium cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>Switch Country Newsroom</span>
                  </button>
                  <Link
                    href="/onboarding"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                    <span>Country Preferences</span>
                  </Link>
                  <button
                    onClick={async () => {
                      setIsUserMenuOpen(false);
                      try {
                        const { createClient } = await import('@/lib/supabase/client');
                        const supabase = createClient();
                        await supabase.auth.signOut();
                      } catch {}
                      try {
                        localStorage.removeItem('voxpolis_session_active');
                        localStorage.removeItem('voxpolis_user_name');
                        localStorage.removeItem('voxpolis_username');
                        localStorage.removeItem('voxpolis_user_email');
                      } catch {}
                      setCurrentUser(null);
                      window.location.href = '/login';
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Desktop: Distinct Log In & Sign Up */}
              <Link
                href="/login"
                className="hidden sm:inline-block text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1.5"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="hidden sm:inline-block text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition"
              >
                Sign Up
              </Link>

              {/* Mobile: Merged single button for space saving */}
              <Link
                href="/login"
                className="sm:hidden text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg shadow-sm transition whitespace-nowrap"
              >
                Sign In / Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Regional Selector Modal */}
      <RegionalCountrySelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedCountry={selectedCountry}
        onSelectCountry={handleCountrySelect}
      />

      {/* Auth Prompt Modal for Guests */}
      <AuthPromptModal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
      />

      {/* Member Milestone Achievement Pop-up */}
      <MilestoneAchievementModal
        memberSince={memberSince}
        userName={user?.fullName || 'Citizen'}
      />
    </header>
  );
}
