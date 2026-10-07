'use client';

import { ReactNode, useEffect, useState } from 'react';

interface NewsAdDesktopLayoutProps {
  children: ReactNode;
  /** Optional custom top banner ad slot */
  topBanner?: ReactNode;
  /** Optional custom bottom banner ad slot */
  bottomBanner?: ReactNode;
  /** Extra class names for center content container */
  contentClassName?: string;
}

export default function NewsAdDesktopLayout({
  children,
  topBanner,
  bottomBanner,
  contentClassName = '',
}: NewsAdDesktopLayoutProps) {
  const [adClient, setAdClient] = useState<string | null>(null);

  useEffect(() => {
    const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || '';
    if (pubId && pubId !== 'ca-pub-0000000000000000' && pubId.startsWith('ca-pub-')) {
      setAdClient(pubId);
      try {
        if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        }
      } catch {}
    }
  }, []);

  const isRealAdConfigured = !!adClient;

  // If AdSense is not yet activated, do NOT display any empty ads or placeholders.
  // Render clean, beautiful news feed without empty boxes or shifts.
  if (!isRealAdConfigured) {
    return (
      <main className={`flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 ${contentClassName}`}>
        {children}
      </main>
    );
  }

  // When AdSense IS activated, arrange the 3-column desktop layout to accommodate all ad sizes
  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-center items-start gap-6">
      {/* ------------------------------------------------------------- */}
      {/* LEFT COLUMN: Skyscraper Ad Slot (160x600 / 300x600)           */}
      {/* Strictly Desktop Only: hidden on mobile & tablets             */}
      {/* ------------------------------------------------------------- */}
      <aside
        aria-label="Left Skyscraper Advertisement"
        className="hidden xl:block shrink-0 w-[160px] 2xl:w-[200px] sticky top-20 self-start z-10"
      >
        <div className="w-full min-h-[600px] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-2 flex flex-col justify-between items-center shadow-sm overflow-hidden text-center">
          <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 py-1 border-b border-gray-100 dark:border-gray-800/80 w-full">
            ADVERTISEMENT
          </div>
          <div className="flex-1 w-full flex items-center justify-center my-2 overflow-hidden">
            <ins
              className="adsbygoogle"
              style={{ display: 'inline-block', width: '160px', height: '600px' }}
              data-ad-client={adClient}
              data-ad-slot="1600000001"
              data-ad-format="vertical"
            />
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* CENTER COLUMN: Main News Feed & Reading Content               */}
      {/* ------------------------------------------------------------- */}
      <main className={`flex-1 min-w-0 max-w-4xl w-full space-y-6 ${contentClassName}`}>
        {/* Top Horizontal Banner (728x90 Leaderboard / Fluid) */}
        {topBanner !== undefined ? (
          topBanner
        ) : (
          <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 p-2 sm:p-3 shadow-sm overflow-hidden text-center">
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 pb-1.5 border-b border-gray-100 dark:border-gray-800/80 mb-2">
              ADVERTISEMENT
            </div>
            <div className="min-h-[90px] flex items-center justify-center overflow-hidden">
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', textAlign: 'center' }}
                data-ad-client={adClient}
                data-ad-slot="1000000001"
                data-ad-format="horizontal"
                data-full-width-responsive="true"
              />
            </div>
          </div>
        )}

        {/* Primary News Body */}
        {children}

        {/* Bottom Horizontal Banner (728x90 Leaderboard / Fluid) */}
        {bottomBanner !== undefined ? (
          bottomBanner
        ) : (
          <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 p-2 sm:p-3 shadow-sm overflow-hidden text-center mt-6">
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 pb-1.5 border-b border-gray-100 dark:border-gray-800/80 mb-2">
              ADVERTISEMENT
            </div>
            <div className="min-h-[90px] flex items-center justify-center overflow-hidden">
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', textAlign: 'center' }}
                data-ad-client={adClient}
                data-ad-slot="1000000002"
                data-ad-format="horizontal"
                data-full-width-responsive="true"
              />
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT COLUMN: Stacked Ad Units (300x250 Medium Rectangles)    */}
      {/* Strictly Desktop Only: hidden on mobile & tablets             */}
      {/* ------------------------------------------------------------- */}
      <aside
        aria-label="Right Column Advertisements"
        className="hidden lg:block shrink-0 w-[300px] sticky top-20 self-start z-10 space-y-6"
      >
        {/* Ad Unit 1: Top 300x250 */}
        <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-3 shadow-sm overflow-hidden text-center">
          <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-800/80 mb-2">
            ADVERTISEMENT
          </div>
          <div className="min-h-[250px] flex items-center justify-center overflow-hidden">
            <ins
              className="adsbygoogle"
              style={{ display: 'inline-block', width: '300px', height: '250px' }}
              data-ad-client={adClient}
              data-ad-slot="3000000001"
              data-ad-format="rectangle"
            />
          </div>
        </div>

        {/* Ad Unit 2: Bottom 300x250 or 300x600 Half Page */}
        <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-3 shadow-sm overflow-hidden text-center">
          <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-800/80 mb-2">
            ADVERTISEMENT
          </div>
          <div className="min-h-[250px] flex items-center justify-center overflow-hidden">
            <ins
              className="adsbygoogle"
              style={{ display: 'inline-block', width: '300px', height: '250px' }}
              data-ad-client={adClient}
              data-ad-slot="3000000002"
              data-ad-format="rectangle"
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
