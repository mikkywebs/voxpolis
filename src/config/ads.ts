/**
 * Ad network switches. Everything stays OFF until the matching env var is set in Vercel.
 *
 *   NEXT_PUBLIC_ADSENSE_PUB_ID   ca-pub-XXXXXXXXXXXXXXXX   → loads AdSense, fills AdSlot units, adds ads.txt line
 *   NEXT_PUBLIC_MONETAG_SRC      script URL Monetag gives you (e.g. https://xxxx.com/tag.min.js)
 *   NEXT_PUBLIC_MONETAG_ZONE     zone id Monetag gives you (used as data-zone)
 *   ADS_TXT_EXTRA                extra ads.txt lines from Monetag (use \n between lines)
 *   MONETAG_VERIFICATION         content of Monetag's site-verification meta tag, if they ask for one
 */

export function getAdsenseClient(): string | null {
  const id = (process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || '').trim();
  return /^ca-pub-\d{10,}$/.test(id) && !/^ca-pub-0+$/.test(id) ? id : null;
}

export function getMonetag(): { src: string; zone?: string } | null {
  const src = (process.env.NEXT_PUBLIC_MONETAG_SRC || '').trim();
  if (!/^https:\/\//.test(src)) return null;
  return { src, zone: (process.env.NEXT_PUBLIC_MONETAG_ZONE || '').trim() || undefined };
}

export function adsTxtLines(): string[] {
  const lines: string[] = [];
  const adsense = getAdsenseClient();
  if (adsense) lines.push(`google.com, ${adsense.replace('ca-', '')}, DIRECT, f08c47fec0942fa0`);
  const extra = (process.env.ADS_TXT_EXTRA || '').replace(/\\n/g, '\n');
  extra
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((l) => lines.push(l));
  return lines;
}
