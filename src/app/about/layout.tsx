import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Voxpolis',
  description: 'Who we are and why Voxpolis explains political news from Nigeria, Africa and the world in plain, original reporting.',
  alternates: { canonical: '/about' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
