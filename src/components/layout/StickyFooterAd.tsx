'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, ChevronUp, Sparkles } from 'lucide-react';

const NON_NEWS_PATHS = [
  '/login',
  '/signup',
  '/about',
  '/contact',
  '/corrections',
  '/privacy',
  '/terms',
  '/onboarding',
  '/admin',
  '/verify-email',
  '/columnist',
];

export default function StickyFooterAd() {
  const pathname = usePathname() || '';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [adClient, setAdClient] = useState<string | null>(null);

  useEffect(() => {
    const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || '';
    if (pubId && pubId !== 'ca-pub-0000000000000000' && pubId.startsWith('ca-pub-')) {
      setAdClient(pubId);
    }

    const handleScroll = () => {
      if (window.scrollY > 350) {
        setHasScrolled(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll in case user reloaded midway down page
    if (typeof window !== 'undefined' && window.scrollY > 350) {
      setHasScrolled(true);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 1. Strictly block placeholder ads if live AdSense is not configured
  if (!adClient) {
    return null;
  }

  // 2. Strictly do not pop immediately on page load: only appear when user scrolls down
  if (!hasScrolled) {
    return null;
  }

  // 3. Strictly block ads on non-news paths or if dismissed
  if (isDismissed || NON_NEWS_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 flex justify-center p-2 pointer-events-none transition-all duration-500 animate-in fade-in slide-in-from-bottom-5">
      <div className="pointer-events-auto bg-gray-900/95 dark:bg-black/95 text-white border border-gray-700/60 rounded-2xl shadow-2xl backdrop-blur-md max-w-2xl w-full transition-all duration-300">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 text-[10px] text-gray-400 font-semibold tracking-wider uppercase">
          <span className="flex items-center gap-1 text-amber-400">
            <Sparkles className="w-3 h-3" /> SPONSORED ADVERTISEMENT
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hover:text-white transition cursor-pointer"
              title={isCollapsed ? 'Expand Ad' : 'Collapse Ad'}
            >
              <ChevronUp className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
            </button>
            <button onClick={() => setIsDismissed(true)} className="hover:text-white transition cursor-pointer" title="Close Ad">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-3 text-center min-h-[90px] flex items-center justify-center">
            <ins
              className="adsbygoogle"
              style={{ display: 'block', width: '100%', textAlign: 'center' }}
              data-ad-client={adClient}
              data-ad-slot="1000000004"
              data-ad-format="horizontal"
              data-full-width-responsive="true"
            />
          </div>
        )}
      </div>
    </div>
  );
}
