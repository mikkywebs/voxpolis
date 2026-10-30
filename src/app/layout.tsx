import type { Metadata, Viewport } from 'next';
import './globals.css';
import CookieConsentBanner from '@/components/layout/CookieConsentBanner';
import StickyFooterAd from '@/components/layout/StickyFooterAd';
import ScrollToTopButton from '@/components/layout/ScrollToTopButton';
import NetworkErrorOverlay from '@/components/common/NetworkErrorOverlay';
import AdScripts from '@/components/ads/AdScripts';
import { getAdsenseClient, getMonetag } from '@/config/ads';
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Political News Explained`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    types: { 'application/rss+xml': `${SITE_URL}/feed.xml` },
  },
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_GB',
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.MONETAG_VERIFICATION ? { monetag: process.env.MONETAG_VERIFICATION } : undefined,
  },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b1220',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsense = getAdsenseClient();
  const monetag = getMonetag();

  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen antialiased flex flex-col justify-between">
        {children}
        <ScrollToTopButton />
        <CookieConsentBanner />
        <StickyFooterAd />
        <NetworkErrorOverlay />
        <AdScripts adsense={adsense} monetag={monetag} />
      </body>
    </html>
  );
}
