'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Loads AdSense / Monetag only on pages that allow ads.
 * A page opts out with <meta name="voxpolis-ads" content="off"> (unreviewed stories, account pages).
 */
const NO_AD_PATHS = ['/login', '/signup', '/verify-email', '/onboarding', '/profile', '/admin'];

export function adsAllowedHere(pathname: string): boolean {
  if (typeof document === 'undefined') return false;
  if (NO_AD_PATHS.some((p) => pathname.startsWith(p))) return false;
  return !document.querySelector('meta[name="voxpolis-ads"][content="off"]');
}

function inject(id: string, src: string, attrs: Record<string, string> = {}) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  s.src = src;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.body.appendChild(s);
}

export default function AdScripts({ adsense, monetag }: { adsense: string | null; monetag: { src: string; zone?: string } | null }) {
  const pathname = usePathname() || '/';
  useEffect(() => {
    if (!adsAllowedHere(pathname)) return;
    if (adsense) inject('adsense', `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`, { crossorigin: 'anonymous' });
    if (monetag) inject('monetag', monetag.src, monetag.zone ? { 'data-zone': monetag.zone } : {});
  }, [pathname, adsense, monetag]);
  return null;
}
