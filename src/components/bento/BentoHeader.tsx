'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteLogo from '@/components/branding/SiteLogo';
import { CountryConfig } from '@/config/countries';
import { Sun, Moon, Search, ChevronDown, User, Newspaper, Sparkles } from 'lucide-react';

interface BentoHeaderProps {
  user?: {
    id: string;
    email?: string;
    fullName?: string;
  } | null;
  selectedCountry: CountryConfig;
  onOpenCountryModal: () => void;
  onSearchClick?: () => void;
}

export default function BentoHeader({
  user,
  selectedCountry,
  onOpenCountryModal,
  onSearchClick,
}: BentoHeaderProps) {
  const [greeting, setGreeting] = useState('Good day');
  const [formattedDate, setFormattedDate] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // 1. Calculate time of day greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // 2. Format current date (e.g., October 10)
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    setFormattedDate(dateStr);

    // 3. Initialize dark mode state from document / localStorage
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('voxpolis_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('voxpolis_theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/80 dark:border-neutral-800/80 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md transition-colors duration-200 shadow-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative gap-2 sm:gap-4">
        {/* Top-Left: Date, Greeting & Country Selector */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Mobile Country Button */}
          <button
            onClick={onOpenCountryModal}
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-100 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-400 transition text-gray-800 dark:text-gray-200 font-semibold cursor-pointer shrink-0 shadow-xs"
            title="Change active country edition"
          >
            <span className="text-sm leading-none">{selectedCountry.flag}</span>
            <span className="font-bold text-xs truncate max-w-[80px] sm:max-w-[110px]">
              {selectedCountry.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Desktop Greeting & Date */}
          <div className="hidden lg:flex items-center gap-2 text-gray-500 dark:text-neutral-400 font-medium text-xs">
            <span className="font-semibold text-gray-800 dark:text-gray-200">{formattedDate}</span>
            <span>·</span>
            <span>{greeting}</span>
          </div>
        </div>

        {/* Center: Brand Logo */}
        <div className="flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-auto">
          <Link href="/" className="flex items-center hover:opacity-90 transition">
            <SiteLogo variant="full" className="h-8 sm:h-9 w-auto" />
          </Link>
        </div>

        {/* Top-Right: Dark Mode Toggle, Search & User Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Dark / Light Mode Switch */}
          <button
            onClick={toggleDarkMode}
            type="button"
            className="p-2 rounded-xl text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-900 transition border border-transparent hover:border-gray-200 dark:hover:border-neutral-800"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-700" />}
          </button>

          {/* User Account / Navigation */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
              >
                <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline truncate max-w-[100px]">{user.fullName || 'Citizen'}</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/login"
                className="hidden sm:inline-block text-xs font-semibold text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white px-2.5 py-1.5 transition"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 sm:px-3.5 py-1.5 rounded-xl shadow-xs transition"
              >
                Join Free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
