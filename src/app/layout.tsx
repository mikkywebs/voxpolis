import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import CookieConsentBanner from '@/components/layout/CookieConsentBanner';
import StickyFooterAd from '@/components/layout/StickyFooterAd';
import ScrollToTopButton from '@/components/layout/ScrollToTopButton';

import NetworkErrorOverlay from '@/components/common/NetworkErrorOverlay';

export const metadata: Metadata = {
  title: 'Voxpolis | Real Political News Made Simple',
  description:
    'Get quick, clear political news, key facts behind the headlines, and real public sentiment from around the world — without the clutter.',
  metadataBase: new URL('https://voxpolis.app'),
  openGraph: {
    title: 'Voxpolis | Real Political News Made Simple',
    description:
      'Get quick, clear political news, key facts behind the headlines, and real public sentiment from around the world — without the clutter.',
    url: 'https://voxpolis.app',
    siteName: 'Voxpolis',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pubId = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || 'ca-pub-0000000000000000';

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Google AdSense Auto Ads Script (Enables #google_vignette Interstitial Ads when reading news) */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-screen antialiased flex flex-col justify-between">
        {children}
        <ScrollToTopButton />
        <CookieConsentBanner />
        <StickyFooterAd />
        <NetworkErrorOverlay />
      </body>
    </html>
  );
}
