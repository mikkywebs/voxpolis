import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Corrections Policy',
  description: 'How Voxpolis handles errors: how to report one, how we check it and how corrections are shown.',
  alternates: { canonical: '/corrections' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
