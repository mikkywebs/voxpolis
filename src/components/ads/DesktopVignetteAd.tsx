'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface DesktopVignetteAdProps {
  isAllowed?: boolean;
}

export default function DesktopVignetteAd({ isAllowed = true }: DesktopVignetteAdProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Check if live AdSense publisher ID is configured (dormant if demo or not set)
  const hasActiveAds = !!(
    isAllowed &&
    process.env.NEXT_PUBLIC_ADSENSE_PUB_ID &&
    process.env.NEXT_PUBLIC_ADSENSE_PUB_ID !== 'ca-pub-0000000000000000' &&
    process.env.NEXT_PUBLIC_ADSENSE_PUB_ID.startsWith('ca-pub-')
  );

  useEffect(() => {
    // Only activate if real AdSense is configured and we are on desktop
    if (!hasActiveAds) return;
    if (typeof window === 'undefined') return;

    // Do not show if already viewed/dismissed in this session (Better Ads frequency cap)
    const alreadySeen = sessionStorage.getItem('voxpolis_vignette_seen');
    if (alreadySeen) return;

    // Desktop check: window width >= 1024px
    if (window.innerWidth < 1024) return;

    let triggered = false;

    // Scroll-based trigger (user has read through 50%+ of the content)
    const handleScroll = () => {
      if (triggered) return;
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0 && scrollY / docHeight > 0.5) {
        triggered = true;
        setIsVisible(true);
        sessionStorage.setItem('voxpolis_vignette_seen', 'true');
        window.removeEventListener('scroll', handleScroll);
      }
    };

    // Time-based fallback: trigger after 30 seconds of active browsing
    const timer = setTimeout(() => {
      if (!triggered && !sessionStorage.getItem('voxpolis_vignette_seen')) {
        triggered = true;
        setIsVisible(true);
        sessionStorage.setItem('voxpolis_vignette_seen', 'true');
        window.removeEventListener('scroll', handleScroll);
      }
    }, 30000);

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [hasActiveAds]);

  const handleClose = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('voxpolis_vignette_seen', 'true');
    }
  };

  // If AdSense is not ready, or modal is dismissed, render nothing
  if (!hasActiveAds || !isVisible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="hidden lg:flex fixed inset-0 z-50 bg-black/80 backdrop-blur-sm items-center justify-center p-6 animate-in fade-in duration-300"
      onClick={handleClose}
    >
      <div
        className="relative max-w-2xl w-full bg-slate-900 border border-gray-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col items-center text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Dismiss Button */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-gray-800">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Sponsored Notice
          </span>
          <button
            onClick={handleClose}
            className="flex items-center gap-1 text-xs font-bold text-gray-300 hover:text-white px-3 py-1 rounded-full bg-gray-800 hover:bg-gray-700 transition cursor-pointer"
          >
            <span>Close</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* AdSense Interstitial Canvas */}
        <div className="w-full min-h-[300px] sm:min-h-[350px] flex items-center justify-center bg-slate-950/60 rounded-2xl border border-gray-800/80 p-4">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}
            data-ad-slot="vignette-desktop"
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>

        {/* CTA Footer */}
        <div className="pt-2">
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition"
          >
            Continue to Voxpolis Report
          </button>
        </div>
      </div>
    </div>
  );
}
