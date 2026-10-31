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

  // Side ad columns used made-up ad unit ids, so this layout always shows the plain feed.
  // Ads on news pages come from <AdSlot> spaces and AdSense Auto ads once approved.
  void adClient;
  return (
    <main className={`flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 ${contentClassName}`}>
      {children}
    </main>
  );
}
