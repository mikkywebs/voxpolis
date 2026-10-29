'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { CountryConfig, getCountryByCode, getCountrySlug } from '@/config/countries';

/** Site header for server-rendered pages (handles the country switch on the client). */
export default function ArticleChrome({ countryCode }: { countryCode: string }) {
  const router = useRouter();
  const country = getCountryByCode(countryCode);
  const onSelect = (c: CountryConfig) => {
    try {
      document.cookie = `voxpolis_country=${c.code}; path=/; max-age=31536000; samesite=lax`;
      localStorage.setItem('voxpolis_primary_country', c.code);
    } catch {}
    router.push(`/${getCountrySlug(c)}`);
  };
  return <Header selectedCountry={country} onSelectCountry={onSelect} />;
}
