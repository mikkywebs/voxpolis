import type { Metadata } from 'next';
import './globals.css';
import CookieConsentBanner from '@/components/layout/CookieConsentBanner';
import StickyFooterAd from '@/components/layout/StickyFooterAd';

export const metadata: Metadata = {
  title: 'Vospolis - Personalized Global Political News Platform',
  description:
    'Tailored political news intelligence, Claude AI factual analysis, public sentiment polls, and multi-country feeds without content paywalls.',
  metadataBase: new URL('https://vospolis.app'),
  openGraph: {
    title: 'Vospolis - Personalized Global Political News',
    description: 'Factual AI political analysis and global news feeds.',
    url: 'https://vospolis.app',
    siteName: 'Vospolis',
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
