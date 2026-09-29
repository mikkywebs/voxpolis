import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import CookieConsentBanner from '@/components/layout/CookieConsentBanner';
import StickyFooterAd from '@/components/layout/StickyFooterAd';
import ScrollToTopButton from '@/components/layout/ScrollToTopButton';

export const metadata: Metadata = {
  title: 'Voxpolis - Global Political Intelligence & News Platform',
  description:
    'Direct global political intelligence, news briefs, multi-nation coverage, and real-time civic sentiment analysis without content paywalls.',
  metadataBase: new URL('https://voxpolis.app'),
  openGraph: {
    title: 'Voxpolis - Independent Global Political Intelligence',
    description: 'Direct global political news coverage and citizen sentiment analysis.',
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
      </body>
    </html>
  );
}
