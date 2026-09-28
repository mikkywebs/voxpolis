import type { Metadata } from 'next';
import './globals.css';
import CookieConsentBanner from '@/components/layout/CookieConsentBanner';
import StickyFooterAd from '@/components/layout/StickyFooterAd';

export const metadata: Metadata = {
  title: 'Voxpolis - Global Political Intelligence & News Platform',
  description:
    'Direct global political intelligence, executive fact summaries, multi-nation coverage, and real-time civic sentiment analysis without content paywalls.',
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
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen antialiased flex flex-col justify-between">
        {children}
        <CookieConsentBanner />
        <StickyFooterAd />
      </body>
    </html>
  );
}
