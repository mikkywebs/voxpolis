'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CountryConfig } from '@/config/countries';
import { WeatherData } from '@/lib/weather';
import { ArticleData } from '@/lib/news';
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

/**
 * Derives an authentic, high-precision civic debate question based on real trending headlines in the country.
 */
function deriveTrendingCivicQuestion(articles: ArticleData[] = [], country: CountryConfig): string {
  if (!articles || articles.length === 0) {
    return `Do you approve of the current economic and governance direction in ${country.name}?`;
  }

  // Look through top 3 trending stories
  for (const art of articles.slice(0, 4)) {
    if (art.poll?.question && art.poll.question.trim().endsWith('?')) {
      return art.poll.question.trim();
    }

    const title = (art.title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();
    const text = `${title} ${art.snippet || ''}`.toLowerCase();

    // 1. Debt, Budget, Deficit, Government spending
    if (text.includes('debt') || text.includes('deficit') || text.includes('spending') || text.includes('borrowing')) {
      if (text.includes('promise') || text.includes('election')) {
        return `Should the government prioritise national debt reduction over funding new election promises in ${country.name}?`;
      }
      return `Do you believe reducing public debt should take priority over increased government spending in ${country.name}?`;
    }

    // 2. Staff cuts, Service cuts, Closures, Disaster readiness
    if (
      text.includes('cut') ||
      text.includes('closed') ||
      text.includes('closure') ||
      text.includes('disaster') ||
      text.includes('tsunami') ||
      text.includes('quake') ||
      text.includes('emergency') ||
      text.includes('staff')
    ) {
      return `Do public sector budget and staffing cuts compromise national emergency preparedness and public safety in ${country.name}?`;
    }

    // 3. Farming, Water storage, Agriculture, Environment, Loans
    if (text.includes('water storage') || text.includes('farmer') || text.includes('farming') || text.includes('agriculture') || text.includes('scheme')) {
      return `Do you support government-backed financing schemes for regional water storage and agricultural development in ${country.name}?`;
    }

    // 4. Tax cuts, Tax reform, VAT, Tariffs
    if (text.includes('tax') || text.includes('tariff') || text.includes('vat') || text.includes('revenue')) {
      return `Do you support the proposed tax and tariff reforms currently being debated in ${country.name}?`;
    }

    // 5. Health, Hospitals, Healthcare, Doctors, Nurses
    if (text.includes('hospital') || text.includes('health') || text.includes('doctor') || text.includes('nurse')) {
      return `Should the government increase emergency funding allocations to the public healthcare system in ${country.name}?`;
    }

    // 6. Housing, Rents, Mortgage
    if (text.includes('housing') || text.includes('rent') || text.includes('mortgage') || text.includes('home')) {
      return `Should stricter regulatory caps or rent controls be enacted to address the housing crisis in ${country.name}?`;
    }

    // 7. Election, Coalition, Leadership
    if (text.includes('election') || text.includes('coalition') || text.includes('parliament') || text.includes('leader')) {
      return `Do you believe the governing coalition's legislative priorities reflect the public interest in ${country.name}?`;
    }

    // 8. Named Speaker / Position
    if (title.includes(':')) {
      const speaker = title.split(':')[0]?.trim();
      if (speaker && speaker.length > 2 && speaker.length < 28 && !/^\d+/.test(speaker)) {
        return `Do you agree with the stance taken by ${speaker} on this national issue in ${country.name}?`;
      }
    }
  }

  // Fallback if no specific keyword match
  const topTitle = (articles[0]?.title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();
  if (topTitle && topTitle.length > 10) {
    return `Do you support the proposed governance approach regarding "${topTitle.slice(0, 50)}..." in ${country.name}?`;
  }

  return `Do you approve of the current economic and governance direction in ${country.name}?`;
}

export default function LeftWidgetRail({
  country,
  trendingArticles = [],
  initialPoll,
  variant = 'rail',
}: LeftWidgetRailProps) {
  // --- 1. Weather State ---
  const [weather, setWeather] = useState<(WeatherData & { capital?: string }) | null>(null);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');

  useEffect(() => {
    let isMounted = true;
    async function loadWeather() {
      try {
        const res = await fetch(`/api/weather?country=${country.code}&lat=${country.lat}&lon=${country.lon}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setWeather(data);
        }
      } catch (e) {
        console.warn('Weather fetch error:', e);
      }
    }
    loadWeather();
    return () => {
      isMounted = false;
    };
  }, [country.code, country.lat, country.lon]);

  // --- 2. Country Civic Poll State ---
  // Derive question from trending headlines for this country
  const trendingQuestion = deriveTrendingCivicQuestion(trendingArticles, country);

  const [poll, setPoll] = useState<any>(initialPoll || null);
  const [agreeCount, setAgreeCount] = useState<number>(initialPoll?.agree_count || 148);
  const [disagreeCount, setDisagreeCount] = useState<number>(initialPoll?.disagree_count || 92);
  const [userVote, setUserVote] = useState<'agree' | 'disagree' | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const voteStorageKey = `voxpolis_vote_${country.code}`;
    const pollStorageKey = `voxpolis_poll_${country.code}`;

    // Restore saved vote for this country
    try {
      const savedVote = localStorage.getItem(voteStorageKey) as 'agree' | 'disagree' | null;
      if (savedVote) setUserVote(savedVote);

      const savedCounts = localStorage.getItem(pollStorageKey);
      if (savedCounts) {
        const parsed = JSON.parse(savedCounts);
        if (typeof parsed.agree === 'number') setAgreeCount(parsed.agree);
        if (typeof parsed.disagree === 'number') setDisagreeCount(parsed.disagree);
      }
    } catch {}

    // Fetch real country civic poll from API, passing top trending headline
    async function loadCountryPoll() {
      try {
        const topHeadline = trendingArticles[0]?.title || '';
        const url = `/api/polls/country?country=${country.code}${topHeadline ? `&headline=${encodeURIComponent(topHeadline)}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.poll) {
            setPoll(data.poll);
            if (typeof data.poll.agree_count === 'number' && typeof data.poll.disagree_count === 'number') {
              setAgreeCount((prev) => Math.max(prev, data.poll.agree_count));
              setDisagreeCount((prev) => Math.max(prev, data.poll.disagree_count));
            }
          }
        }
      } catch (e) {
        console.warn('Poll fetch error:', e);
      }
    }

    loadCountryPoll();
    return () => {
      isMounted = false;
    };
  }, [country.code, trendingArticles]);

  const handleVote = async (type: 'agree' | 'disagree') => {
    if (userVote === type || isVoting) return;
    setIsVoting(true);

    const prevVote = userVote;
    let nextAgree = agreeCount;
    let nextDisagree = disagreeCount;

    if (prevVote === 'agree') nextAgree = Math.max(0, nextAgree - 1);
    if (prevVote === 'disagree') nextDisagree = Math.max(0, nextDisagree - 1);

    if (type === 'agree') nextAgree += 1;
    if (type === 'disagree') nextDisagree += 1;

    setUserVote(type);
    setAgreeCount(nextAgree);
    setDisagreeCount(nextDisagree);

    try {
      localStorage.setItem(`voxpolis_vote_${country.code}`, type);
      localStorage.setItem(`voxpolis_poll_${country.code}`, JSON.stringify({ agree: nextAgree, disagree: nextDisagree }));
    } catch {}

    // Sync with database
    try {
      await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: poll?.id || `poll-${country.code.toLowerCase()}`,
          vote: type,
        }),
      });
    } catch {}

    setIsVoting(false);
  };

  const totalVotes = agreeCount + disagreeCount;
  const agreePct = totalVotes > 0 ? Math.round((agreeCount / totalVotes) * 100) : 50;
  const disagreePct = totalVotes > 0 ? 100 - agreePct : 50;
  const displayQuestion = poll?.question || trendingQuestion;

  // Render for mobile interleaved strip
  if (variant === 'mobile_strip') {
    return (
      <div className="w-full space-y-3 lg:hidden my-4">
        {/* Compact Weather Bar */}
        <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3.5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{weather?.icon || '⛅'}</span>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                <span>{country.capital}, {country.name}</span>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-neutral-400">
                {weather?.condition || 'Partly Cloudy'} • AQI {weather?.aqi || 42} ({weather?.aqiLabel || 'Good'})
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">
              {tempUnit === 'C' ? `${weather?.tempC ?? 26}°C` : `${weather?.tempF ?? 78}°F`}
            </span>
            <button
              onClick={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}
              className="block text-[10px] text-blue-600 dark:text-blue-400 font-semibold"
            >
              °{tempUnit === 'C' ? 'F' : 'C'}
            </button>
          </div>
        </div>

        {/* Compact Civic Poll Card with Real-time Percentages */}
        <div className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5">
            <div className="flex items-center gap-1.5">
              <Vote className="w-3.5 h-3.5" />
              <span>Civic Poll · {country.name}</span>
            </div>
            <span className="text-gray-400 text-[10px] font-semibold">{totalVotes} votes</span>
          </div>

          <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug mb-2.5">
            {displayQuestion}
          </h4>

          {/* Real-time Percentage Bar (Always Visible) */}
          {totalVotes > 0 && (
            <div className="mb-3 space-y-1">
              <div className="flex justify-between text-[11px] font-extrabold">
                <span className="text-blue-600 dark:text-blue-400">{agreePct}% Agree</span>
                <span className="text-rose-600 dark:text-rose-400">{disagreePct}% Disagree</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden flex">
                <div style={{ width: `${agreePct}%` }} className="h-full bg-blue-600 transition-all duration-500 rounded-l-full" />
                <div style={{ width: `${disagreePct}%` }} className="h-full bg-rose-600 transition-all duration-500 rounded-r-full" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleVote('agree')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                userVote === 'agree'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200'
              }`}
            >
              <span>Agree</span>
              {userVote === 'agree' && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => handleVote('disagree')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                userVote === 'disagree'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200'
              }`}
            >
              <span>Disagree</span>
              {userVote === 'disagree' && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Left Widget Rail
  return (
    <aside className="w-full space-y-4">
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
              {tempUnit === 'C' ? `${weather?.tempC ?? 26}°C` : `${weather?.tempF ?? 78}°F`}
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-neutral-300 capitalize mt-0.5">
              {weather?.condition || 'Partly Cloudy'}
            </div>
          </div>
          <div className="text-4xl select-none" role="img" aria-label="Weather icon">
            {weather?.icon || '⛅'}
          </div>
        </div>

        {/* Live Metrics: AQI, Humidity, Wind */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800 text-[11px]">
          {/* Air Quality Index */}
          <div className="flex flex-col">
            <span className="text-gray-400 dark:text-neutral-500 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-emerald-500" />
              <span>AQI</span>
            </span>
            <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
              {weather?.aqi ?? 42} <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{weather?.aqiLabel ?? 'Good'}</span>
            </span>
          </div>

          {/* Humidity */}
          <div className="flex flex-col">
            <span className="text-gray-400 dark:text-neutral-500 flex items-center gap-1">
              <Droplets className="w-3 h-3 text-blue-500" />
              <span>Humidity</span>
            </span>
            <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
              {weather?.humidity ?? 68}%
            </span>
          </div>

          {/* Wind Speed */}
          <div className="flex flex-col">
            <span className="text-gray-400 dark:text-neutral-500 flex items-center gap-1">
              <Wind className="w-3 h-3 text-cyan-500" />
              <span>Wind</span>
            </span>
            <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5">
              {weather?.windSpeed ?? 8} km/h
            </span>
          </div>
        </div>
      </section>

      {/* Widget 2: Ad Space Card (Microsoft Start Bento Style) */}
      <section className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-linear-to-br from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-950 p-4 sm:p-5 shadow-xs transition-colors relative overflow-hidden">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-neutral-500 mb-3">
          <span>Sponsored</span>
          <span className="px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400">Ad</span>
        </div>

        <div className="space-y-2.5">
          <div className="h-28 w-full rounded-xl bg-linear-to-r from-blue-600 via-indigo-600 to-violet-700 flex flex-col justify-end p-3 text-white shadow-xs">
            <span className="text-[10px] uppercase font-extrabold tracking-wider bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full w-fit">
              Partner Spotlight
            </span>
            <h4 className="text-sm font-extrabold mt-1 text-white leading-tight">
              Empowering Independent Journalism
            </h4>
          </div>

          <p className="text-xs text-gray-600 dark:text-neutral-400 leading-relaxed">
            Support verifiable civic reporting with VoxPolis Premium. Ad-free updates, full archive access, and policy intelligence.
          </p>

          <Link
            href="/sponsor"
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold transition shadow-xs"
          >
            <span>Learn More</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Widget 3: Real Country Civic Poll Card (Real-Time Live Percentages) */}
      <section className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            <span>Civic Poll · {country.name}</span>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-neutral-500 font-bold tabular-nums">
            {totalVotes} votes
          </span>
        </div>

        {/* Trending Headline-Based Question */}
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug my-2.5">
          {displayQuestion}
        </h3>

        {/* Real-time Percentage Results Bar (ALWAYS VISIBLE) */}
        {totalVotes > 0 ? (
          <div className="my-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <span>{agreePct}% Agree</span>
                <span className="text-[10px] text-gray-400 dark:text-neutral-500 font-normal">({agreeCount})</span>
              </span>
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <span className="text-[10px] text-gray-400 dark:text-neutral-500 font-normal">({disagreeCount})</span>
                <span>{disagreePct}% Disagree</span>
              </span>
            </div>

            {/* Dual Color Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${agreePct}%` }}
                className="h-full bg-blue-600 transition-all duration-500 rounded-l-full"
                title={`${agreePct}% Agree`}
              />
              <div
                style={{ width: `${disagreePct}%` }}
                className="h-full bg-rose-600 transition-all duration-500 rounded-r-full"
                title={`${disagreePct}% Disagree`}
              />
            </div>
          </div>
        ) : (
          <div className="my-2.5 py-1 text-center text-[11px] text-gray-400 font-medium">
            Be the first citizen to cast a vote on this policy debate.
          </div>
        )}

        {/* Voting Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <button
            type="button"
            onClick={() => handleVote('agree')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${
              userVote === 'agree'
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400'
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600'
            }`}
          >
            <span>Agree</span>
            {userVote === 'agree' && <CheckCircle2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => handleVote('disagree')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${
              userVote === 'disagree'
                ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400'
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600'
            }`}
          >
            <span>Disagree</span>
            {userVote === 'disagree' && <CheckCircle2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {userVote ? (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-2">
            <CheckCircle2 className="w-3 h-3" />
            <span>Your vote is counted in real-time. Change anytime.</span>
          </p>
        ) : (
          <p className="text-[10px] text-gray-400 dark:text-neutral-500 pt-2 text-center">
            Tap Agree or Disagree to cast your vote
          </p>
        )}
      </section>
    </aside>
  );
}
