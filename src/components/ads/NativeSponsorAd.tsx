'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';

interface NativeSponsorAdProps {
  slotLocation: 'top_horizontal' | 'square_300' | 'skyscraper';
  countryCode?: string;
}

interface SponsorAdData {
  id: string;
  sponsor_name: string;
  ad_title: string;
  tagline?: string;
  target_url: string;
  slot_location: string;
  desktop_image_url: string;
  mobile_image_url?: string;
}

export default function NativeSponsorAd({ slotLocation, countryCode }: NativeSponsorAdProps) {
  const [ad, setAd] = useState<SponsorAdData | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchAd() {
      try {
        const query = new URLSearchParams({ slot: slotLocation });
        if (countryCode) query.set('country', countryCode);
        const res = await fetch(`/api/ads/sponsor?${query.toString()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.hasAd && data.ad) {
            setAd(data.ad);
          }
        }
      } catch {
        // Silently catch and stay null
      } finally {
        if (isMounted) setHasLoaded(true);
      }
    }
    fetchAd();
    return () => {
      isMounted = false;
    };
  }, [slotLocation, countryCode]);

  const handleClick = () => {
    if (!ad?.id) return;
    try {
      fetch('/api/ads/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ad.id }),
      }).catch(() => {});
    } catch {}
  };

  // If no sponsor campaign is active, strictly do NOT render empty space
  if (!ad || !hasLoaded) {
    return null;
  }

  // 1. TOP HORIZONTAL BANNER (Before News Headline)
  // Desktop: 728x90 Leaderboard | Mobile: 320x100 Mobile Banner
  if (slotLocation === 'top_horizontal') {
    return (
      <div className="w-full my-4 flex flex-col items-center">
        {/* Subtle Sponsored Micro-header */}
        <div className="w-full max-w-[728px] flex items-center justify-between text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 mb-1">
          <span className="flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            <span>Sponsored by {ad.sponsor_name}</span>
          </span>
          <span className="text-[8px]">ADVERTISEMENT</span>
        </div>

        {/* Desktop View: 728x90 */}
        <a
          href={ad.target_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="hidden md:flex w-[728px] h-[90px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-slate-900 group shadow-sm hover:shadow-md transition relative items-center justify-center shrink-0"
        >
          <img
            src={ad.desktop_image_url}
            alt={ad.ad_title || ad.sponsor_name}
            className="w-full h-full object-cover group-hover:scale-[1.01] transition duration-300"
          />
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[8px] font-bold text-white flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
            <span>Visit</span>
            <ExternalLink className="w-2 h-2" />
          </div>
        </a>

        {/* Mobile View: 320x100 (or 320x50) */}
        <a
          href={ad.target_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="flex md:hidden w-[320px] h-[100px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-slate-900 group shadow-sm transition relative items-center justify-center shrink-0"
        >
          <img
            src={ad.mobile_image_url || ad.desktop_image_url}
            alt={ad.ad_title || ad.sponsor_name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[8px] font-bold text-white flex items-center gap-0.5 opacity-90">
            <span>Ad</span>
            <ExternalLink className="w-2 h-2" />
          </div>
        </a>
      </div>
    );
  }

  // 2. SQUARE 300x300 NATIVE AD (Desktop & Mobile)
  if (slotLocation === 'square_300') {
    return (
      <div className="my-6 flex flex-col items-center justify-center">
        <div className="w-[300px] flex items-center justify-between text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 mb-1">
          <span className="flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            <span>Featured Partner</span>
          </span>
          <span className="text-[8px]">SPONSORED</span>
        </div>

        <a
          href={ad.target_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="w-[300px] h-[300px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-slate-900 group shadow-sm hover:shadow-lg transition relative flex flex-col justify-end shrink-0"
        >
          <img
            src={ad.desktop_image_url}
            alt={ad.ad_title || ad.sponsor_name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300 absolute inset-0"
          />
          <div className="relative z-10 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white space-y-0.5">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{ad.sponsor_name}</div>
            <div className="text-xs font-bold leading-tight line-clamp-2">{ad.ad_title}</div>
            <div className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-semibold pt-1">
              <span>Learn More</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </div>
          </div>
        </a>
      </div>
    );
  }

  // 3. SKYSCRAPER 160x600 (Desktop Only)
  if (slotLocation === 'skyscraper') {
    return (
      <div className="w-[160px] h-[600px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-slate-900 group shadow-sm flex flex-col justify-between shrink-0 relative">
        <div className="text-[8px] font-black uppercase tracking-widest text-gray-400 py-1 text-center border-b border-gray-800 bg-slate-950/80">
          SPONSORED
        </div>
        <a
          href={ad.target_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="flex-1 relative overflow-hidden"
        >
          <img
            src={ad.desktop_image_url}
            alt={ad.ad_title || ad.sponsor_name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        </a>
        <div className="p-2 bg-slate-950 text-center">
          <span className="text-[9px] font-bold text-white block truncate">{ad.sponsor_name}</span>
        </div>
      </div>
    );
  }

  return null;
}
