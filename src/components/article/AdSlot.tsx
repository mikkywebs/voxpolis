'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { adsAllowedHere } from '@/components/ads/AdScripts';

/**
 * One ad space, filled by AdSense OR Monetag. It renders NOTHING (no box, no placeholder)
 * until a network is switched on in Vercel and has a unit for this space.
 *
 * Vercel environment variables:
 *   NEXT_PUBLIC_AD_PROVIDER            adsense | monetag   (optional; default: AdSense if set up, else Monetag)
 *   AdSense:  NEXT_PUBLIC_ADSENSE_PUB_ID  ca-pub-…, plus the ad unit ids from your AdSense account:
 *             NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR, NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE, NEXT_PUBLIC_ADSENSE_SLOT_SKYSCRAPER
 *   Monetag:  NEXT_PUBLIC_MONETAG_BANNER_SRC (banner script link), plus zone ids:
 *             NEXT_PUBLIC_MONETAG_ZONE_SIDEBAR, NEXT_PUBLIC_MONETAG_ZONE_IN_ARTICLE, NEXT_PUBLIC_MONETAG_ZONE_SKYSCRAPER
 */

type Location = 'sidebar' | 'below_dek' | 'mid_article' | 'below_sources' | 'skyscraper_left' | 'skyscraper_right';
type Group = 'SIDEBAR' | 'IN_ARTICLE' | 'SKYSCRAPER';

const GROUP: Record<Location, Group> = {
  sidebar: 'SIDEBAR',
  below_dek: 'IN_ARTICLE',
  mid_article: 'IN_ARTICLE',
  below_sources: 'IN_ARTICLE',
  skyscraper_left: 'SKYSCRAPER',
  skyscraper_right: 'SKYSCRAPER',
};

// Written out in full so Next.js can include the values in the browser bundle.
const ADSENSE_PUB = (process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || '').trim();
const ADSENSE_UNIT: Record<Group, string> = {
  SIDEBAR: (process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || '').trim(),
  IN_ARTICLE: (process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE || '').trim(),
  SKYSCRAPER: (process.env.NEXT_PUBLIC_ADSENSE_SLOT_SKYSCRAPER || '').trim(),
};
const MONETAG_SRC = (process.env.NEXT_PUBLIC_MONETAG_BANNER_SRC || '').trim();
const MONETAG_ZONE: Record<Group, string> = {
  SIDEBAR: (process.env.NEXT_PUBLIC_MONETAG_ZONE_SIDEBAR || '').trim(),
  IN_ARTICLE: (process.env.NEXT_PUBLIC_MONETAG_ZONE_IN_ARTICLE || '').trim(),
  SKYSCRAPER: (process.env.NEXT_PUBLIC_MONETAG_ZONE_SKYSCRAPER || '').trim(),
};
const PREFERRED = (process.env.NEXT_PUBLIC_AD_PROVIDER || '').trim().toLowerCase();

function pick(group: Group): { provider: 'adsense'; unit: string } | { provider: 'monetag'; zone: string } | null {
  const adsense = /^ca-pub-\d{10,}$/.test(ADSENSE_PUB) && !/^ca-pub-0+$/.test(ADSENSE_PUB) && /^\d{6,}$/.test(ADSENSE_UNIT[group]) ? { provider: 'adsense' as const, unit: ADSENSE_UNIT[group] } : null;
  const monetag = /^https:\/\//.test(MONETAG_SRC) && /^\d+$/.test(MONETAG_ZONE[group]) ? { provider: 'monetag' as const, zone: MONETAG_ZONE[group] } : null;
  if (PREFERRED === 'monetag') return monetag || adsense;
  return adsense || monetag;
}

export default function AdSlot({ slotLocation, isAllowed = true }: { slotLocation: Location; isAllowed?: boolean }) {
  const pathname = usePathname() || '';
  const [allowed, setAllowed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const group = GROUP[slotLocation];
  const choice = pick(group);

  useEffect(() => {
    setAllowed(isAllowed && adsAllowedHere(pathname));
  }, [isAllowed, pathname]);

  useEffect(() => {
    if (!allowed || !choice || !box.current) return;
    if (choice.provider === 'adsense') {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch {}
    } else if (!box.current.querySelector('script')) {
      const sc = document.createElement('script');
      sc.async = true;
      sc.src = MONETAG_SRC;
      sc.setAttribute('data-zone', choice.zone);
      sc.setAttribute('data-cfasync', 'false');
      box.current.appendChild(sc);
    }
  }, [allowed, choice?.provider]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!allowed || !choice) return null;

  const sky = group === 'SKYSCRAPER';
  return (
    <aside
      aria-label="Advertisement"
      className={sky ? 'w-[160px] shrink-0 text-center' : group === 'SIDEBAR' ? 'text-center' : 'my-6 text-center'}
    >
      <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Advertisement</div>
      <div ref={box} className={sky ? 'min-h-[600px]' : group === 'SIDEBAR' ? 'min-h-[250px]' : 'min-h-[100px]'}>
        {choice.provider === 'adsense' && (
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={ADSENSE_PUB}
            data-ad-slot={choice.unit}
            data-ad-format={sky ? 'vertical' : 'auto'}
            data-full-width-responsive={sky ? undefined : 'true'}
          />
        )}
      </div>
    </aside>
  );
}
