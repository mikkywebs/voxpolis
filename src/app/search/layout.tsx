import type { Metadata } from 'next';

// Listing/search views duplicate country pages, so keep them out of Google's index.
export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
