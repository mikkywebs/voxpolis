import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Voxpolis collects, uses and protects your data, including cookies and advertising.',
  alternates: { canonical: '/privacy' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
