'use client';

import { getHolidayForDateAndCountry } from '@/lib/holidays';
import { Sparkles } from 'lucide-react';

interface HolidayBannerProps {
  countryCode: string;
}

export default function HolidayBanner({ countryCode }: HolidayBannerProps) {
  const holiday = getHolidayForDateAndCountry(countryCode);

  if (!holiday) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 dark:from-amber-900/20 dark:via-rose-900/20 dark:to-purple-900/20 border border-amber-300/40 dark:border-amber-700/40 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
        {holiday.icon}
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{holiday.name} Special</span>
        </div>
        <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
          {holiday.greeting}
        </p>
      </div>
    </div>
  );
}
