'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';
import RegionalCountrySelectorModal from '@/components/layout/RegionalCountrySelectorModal';
import { CountryConfig } from '@/config/countries';
import { WeatherData } from '@/lib/weather';
import { Sun, Moon, Palette, ChevronDown, User, Shield, LogOut, Languages } from 'lucide-react';

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
  const [greeting, setGreeting] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accentColor, setAccentColor] = useState<'blue' | 'emerald' | 'purple' | 'amber' | 'rose'>('blue');

  // Compute time-of-day greeting
  useEffect(() => {
    const hour = new Date().getHours();
    let timeOfDay = 'day';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 18) timeOfDay = 'afternoon';
    else timeOfDay = 'evening';

    const name = user?.fullName || (user?.email ? user.email.split('@')[0] : 'Guest');
    setGreeting(`Good ${timeOfDay}, ${name}`);
  }, [user]);

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

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Cycle Accent Colors
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Branding Logo & Greeting */}
        <div className="flex items-center gap-4">
          <Link href="/feed" className="flex items-center gap-2 group">
            <SiteLogo variant="full" className="h-8 sm:h-9 w-auto" />
          </Link>
          <div className="hidden md:block text-xs font-medium text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700 pl-4 py-1">
            <span>{greeting}</span>
          </div>
        </div>

        {/* Right: Weather Chip, Regional Country Switcher, Recognized Language Toggle, Theme & User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Weather Chip */}
          {weather && (
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
              <span>{weather.icon}</span>
              <span>{weather.tempC}°C</span>
              <span className="hidden sm:inline text-gray-400">| {weather.condition}</span>
            </div>
          )}

          {/* Regional Country Selector Trigger */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-200 dark:border-gray-700 shadow-sm transition"
          >
            <span className="text-base">{selectedCountry.flag}</span>
            <span className="hidden sm:inline">{selectedCountry.name}</span>
            <span className="sm:hidden font-mono">{selectedCountry.code}</span>
            <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </button>

          {/* Country Recognized Language Switcher (User Request) */}
          {selectedCountry.languages.length > 1 && (
            <div className="relative">
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

          {/* Theme & Accent Switchers */}
          <button
            onClick={toggleDarkMode}
            title="Toggle Dark/Light Mode"
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={cycleAccentColor}
            title={`Accent Color: ${accentColor}`}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition hidden sm:flex"
          >
            <Palette className="w-4 h-4 text-blue-500" />
          </button>

          {/* User Profile / Admin Link */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow">
                  {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-1 text-xs">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{user.fullName || 'User'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                  </div>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-amber-600 dark:text-amber-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    href="/onboarding"
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <User className="w-3.5 h-3.5" />
                    Country Preferences
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
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
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1.5"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition"
              >
                Sign Up
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
        onSelectCountry={onSelectCountry}
      />
    </header>
  );
}
