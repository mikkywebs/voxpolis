import { headers, cookies } from 'next/headers';
import { ALL_COUNTRIES } from '@/config/countries';

export const COUNTRY_COOKIE = 'voxpolis_country';
const DEFAULT_COUNTRY = 'NG';

/**
 * Visitor's country, decided on the server:
 * 1. the country they picked before (cookie), 2. Vercel's IP country header, 3. Nigeria.
 */
export function getVisitorCountryCode(): string {
  const valid = (c?: string | null) => !!c && ALL_COUNTRIES.some((x) => x.code === c.toUpperCase());
  try {
    const picked = cookies().get(COUNTRY_COOKIE)?.value;
    if (valid(picked)) return picked!.toUpperCase();
  } catch {}
  try {
    const h = headers();
    const ip = h.get('x-vercel-ip-country') || h.get('cf-ipcountry');
    if (valid(ip)) return ip!.toUpperCase();
  } catch {}
  return DEFAULT_COUNTRY;
}
