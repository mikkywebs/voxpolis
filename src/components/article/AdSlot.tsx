'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface AdSlotProps {
  slotLocation: 'below_dek' | 'mid_article' | 'below_sources' | 'skyscraper_left' | 'skyscraper_right';
  isAllowed?: boolean;
}

const NON_NEWS_PATHS = [
  '/login',
  '/signup',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/onboarding',
  '/admin',
  '/verify-email',
  '/columnist',
];

export default function AdSlot({ slotLocation, isAllowed = true }: AdSlotProps) {
  const pathname = usePathname() || '';
  const [adClient, setAdClient] = useState<string | null>(null);

  useEffect(() => {
    const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || 'ca-pub-0000000000000000';
    setAdClient(pubId);

    // Initialize adsbygoogle if present
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch {}
  }, []);

  // Strictly return null if on non-news pages or if not allowed
  if (!isAllowed || NON_NEWS_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }

  const isRealAdConfigured = !!(adClient && adClient !== 'ca-pub-0000000000000000' && adClient.startsWith('ca-pub-'));
  if (!isRealAdConfigured) {
    return null;
  }

  // 160x600 Wide Skyscraper vertical format for desktop margins
  if (slotLocation === 'skyscraper_left' || slotLocation === 'skyscraper_right') {
    return (
      <div className="w-[160px] h-[600px] rounded-2xl bg-white/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 text-center flex flex-col justify-between p-2 shrink-0 overflow-hidden shadow-sm">
        <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 py-1 border-b border-gray-100 dark:border-gray-800">
          ADVERTISEMENT
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden my-2">
          <ins
            className="adsbygoogle"
            style={{ display: 'inline-block', width: '160px', height: '560px' }}
            data-ad-client={adClient}
            data-ad-slot={slotLocation === 'skyscraper_left' ? '1600000001' : '1600000002'}
            data-ad-format="vertical"
          />
        </div>
        <div className="text-[8px] text-gray-400 uppercase tracking-wider pb-0.5">Desktop</div>
      </div>
    );
  }

  return (
    <div className="my-6 py-3 px-4 rounded-xl bg-gray-100/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 text-center">
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
        ADVERTISEMENT
      </div>
      {/* Responsive Google AdSense Container */}
      <div className="min-h-[90px] flex items-center justify-center overflow-hidden">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', textAlign: 'center' }}
          data-ad-client={adClient}
          data-ad-slot={
            slotLocation === 'below_dek'
              ? '1000000001'
              : slotLocation === 'mid_article'
              ? '1000000002'
              : '1000000003'
          }
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
