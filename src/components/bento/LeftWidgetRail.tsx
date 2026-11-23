'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CountryConfig } from '@/config/countries';
import { AqiLevel, WeatherData } from '@/lib/weather';
import { ArticleData } from '@/lib/news';
import ReaderPoll, { ReaderPollData } from '@/components/poll/ReaderPoll';
import AdSlot from '@/components/article/AdSlot';
import {
  Wind,
  Droplets,
  Gauge,
  Vote,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  MapPin,
  Radio,
} from 'lucide-react';

interface LeftWidgetRailProps {
  country: CountryConfig;
  trendingArticles?: ArticleData[];
  initialPoll?: {
    id: string;
    question: string;
    agree_count: number;
    disagree_count: number;
  };
  variant?: 'rail' | 'mobile_strip';
}

// US AQI colours (EPA): green, yellow, orange, red, purple, maroon.
const AQI_TEXT: Record<AqiLevel, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  moderate: 'text-yellow-600 dark:text-yellow-400',
  sensitive: 'text-orange-600 dark:text-orange-400',
  unhealthy: 'text-red-600 dark:text-red-400',
  very_unhealthy: 'text-purple-600 dark:text-purple-400',
  hazardous: 'text-rose-800 dark:text-rose-400',
};
const AQI_PILL: Record<AqiLevel, string> = {
  good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  sensitive: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  very_unhealthy: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  hazardous: 'bg-rose-200 text-rose-900 dark:bg-rose-900/50 dark:text-rose-200',
};

export default function LeftWidgetRail({
  country,
  trendingArticles = [],
  initialPoll,
  variant = 'rail',
}: LeftWidgetRailProps) {
  // --- 1. Weather State ---
  const [weather, setWeather] = useState<(WeatherData & { capital?: string }) | null>(null);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [weatherFailed, setWeatherFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (country.code !== 'NG') return; // weather only for Nigeria (Abuja); Africa and World are regions
    async function loadWeather() {
      try {
        const res = await fetch('/api/weather');
        if (!res.ok) throw new Error(`weather ${res.status}`);
        const data = await res.json();
        if (isMounted) setWeather(data);
      } catch (e) {
        console.warn('Weather fetch error:', e);
        if (isMounted) setWeatherFailed(true);
      }
    }
    loadWeather();
    return () => {
      isMounted = false;
    };
  }, [country.code, country.lat, country.lon]);

  // --- 2. Reader poll: the question from the newest published story in this country (real votes only) ---
  const [cpoll, setCpoll] = useState<ReaderPollData | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/polls/country?country=${country.code}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setCpoll(d?.poll || null))
      .catch(() => alive && setCpoll(null));
    return () => {
      alive = false;
    };
  }, [country.code]);

  // Render for mobile interleaved strip
  if (variant === 'mobile_strip') {
    return (
      <div className="w-full space-y-3 lg:hidden my-4">
        {country.code === 'NG' && !weatherFailed && (
          <>
        {/* Compact Weather Bar */}
        <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{weather?.icon || ''}</span>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                <span>{country.capital}, {country.name}</span>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-neutral-400">
                {weather ? (
                  <>
                    {weather.condition}
                    {weather.aqi != null && (
                      <>
                        {' • '}AQI {weather.aqi} <span className={`font-semibold ${AQI_TEXT[weather.aqiLevel || 'good']}`}>{weather.aqiLabel}</span>
                      </>
                    )}
                  </>
                ) : (
                  'Loading weather…'
                )}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">
              {weather ? (tempUnit === 'C' ? `${weather.tempC}°C` : `${weather.tempF}°F`) : '–'}
            </span>
            <button
              onClick={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}
              className="block text-[10px] text-blue-600 dark:text-blue-400 font-semibold"
            >
              °{tempUnit === 'C' ? 'F' : 'C'}
            </button>
          </div>
        </div>
          </>
        )}

        {cpoll && <ReaderPoll poll={cpoll} variant="rail" label={`Reader poll · ${country.name}`} />}
      </div>
    );
  }

  // Desktop Left Widget Rail
  return (
    <aside className="w-full space-y-4">
      {country.code === 'NG' && !weatherFailed && (
        <>
      {/* Widget 1: Local Weather & Air Quality Card */}
      <section className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between text-xs mb-3">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-neutral-400 font-semibold truncate">
            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">{country.capital}, {country.name}</span>
          </div>
          <button
            onClick={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5"
            title="Toggle Celsius / Fahrenheit"
          >
            Switch to °{tempUnit === 'C' ? 'F' : 'C'}
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tight">
              {weather ? (tempUnit === 'C' ? `${weather.tempC}°C` : `${weather.tempF}°F`) : '–'}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-neutral-300 capitalize mt-0.5">
              {weather?.condition || ''}
            </div>
          </div>
          <div className="text-4xl select-none" role="img" aria-label="Weather icon">
            {weather?.icon || ''}
          </div>
        </div>

        {/* Air quality on its own line (its labels can be long), then humidity and wind */}
        {weather?.aqi != null && (
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800 text-[11px]">
            <span className="text-gray-500 dark:text-neutral-400 flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              Air quality (AQI)
            </span>
            <span className={`px-2 py-0.5 rounded-full font-bold ${AQI_PILL[weather.aqiLevel || 'good']}`}>
              {weather.aqi} · {weather.aqiLabel}
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-gray-100 dark:border-neutral-800 text-[11px]">
          <div className="flex flex-col">
            <span className="text-gray-400 dark:text-neutral-500 flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-500" />
              <span>Humidity</span>
            </span>
            <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{weather?.humidity != null ? `${weather.humidity}%` : '–'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 dark:text-neutral-500 flex items-center gap-1">
              <Wind className="w-3 h-3 text-cyan-500" />
              <span>Wind</span>
            </span>
            <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">{weather?.windSpeed != null ? `${weather.windSpeed} km/h` : '–'}</span>
          </div>
        </div>
        {weather?.observedAt && (
          <p className="mt-3 text-[10px] text-gray-400 dark:text-neutral-500">
            Updated {weather.observedAt} Abuja time · Data:{' '}
            <a href="https://open-meteo.com/" target="_blank" rel="noopener" className="underline">
              Open-Meteo
            </a>
          </p>
        )}
      </section>
        </>
      )}

      {/* Widget 2: Ad space. Shows nothing until AdSense or Monetag is switched on. */}
      <AdSlot slotLocation="sidebar" />

      {/* Widget 3: Reader poll (hidden when there is no question from a published story) */}
      {cpoll && <ReaderPoll poll={cpoll} variant="rail" label={`Reader poll · ${country.name}`} />}
    </aside>
  );
}
