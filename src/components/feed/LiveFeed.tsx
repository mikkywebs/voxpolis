'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BentoFeedLayout from '@/components/bento/BentoFeedLayout';
import { createClient } from '@/lib/supabase/client';
import { CountryConfig, getCountryByCode, getCountrySlug } from '@/config/countries';
import { ArticleData } from '@/lib/news';

type Feed = { country: CountryConfig; articles: ArticleData[] };

interface LiveFeedProps {
  mode: 'home' | 'country';
  initialCountryCode: string;
  initialArticles: ArticleData[];
  worldArticles: ArticleData[];
  heading: string;
  intro?: string;
}

function groupByCountry(list: ArticleData[], max = 4): Feed[] {
  const map = new Map<string, ArticleData[]>();
  list.forEach((a) => {
    const arr = map.get(a.country_code) || [];
    arr.push(a);
    map.set(a.country_code, arr);
  });
  return Array.from(map, ([code, articles]) => ({ country: getCountryByCode(code), articles })).slice(0, max);
}

function rememberCountry(code: string) {
  try {
    document.cookie = `voxpolis_country=${code}; path=/; max-age=31536000; samesite=lax`;
    localStorage.setItem('voxpolis_primary_country', code);
  } catch {}
}

/**
 * Feed page shell. The server already rendered the articles (good for Google);
 * this only adds the signed-in member's name on top. Everyone sees the same sections.
 */
export default function LiveFeed({ mode, initialCountryCode, initialArticles, worldArticles, heading, intro }: LiveFeedProps) {
  const router = useRouter();
  const country = getCountryByCode(initialCountryCode);
  const articles = initialArticles;
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    let sub: { unsubscribe: () => void } | undefined;

    async function load(sessionUser: any) {
      if (!sessionUser) {
        setUser(null);
        return;
      }
      const meta = sessionUser.user_metadata || {};
      const u = {
        id: sessionUser.id,
        email: sessionUser.email,
        fullName: meta.full_name || sessionUser.email?.split('@')[0] || 'Member',
      };
      // Same Voxpolis mix for every visitor and member: no per-country homepages any more.
      setUser(u);
    }

    supabase.auth.getSession().then(({ data }) => load(data?.session?.user));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => load(session?.user));
    sub = data?.subscription;
    return () => sub?.unsubscribe();
  }, [mode, initialCountryCode]);

  const handleSelect = (c: CountryConfig) => {
    rememberCountry(c.code);
    router.push(`/${getCountrySlug(c)}`);
  };

  const secondary = groupByCountry(worldArticles.filter((a) => a.country_code !== country.code));

  return (
    <BentoFeedLayout
      selectedCountry={country}
      articles={articles}
      loading={false}
      user={user}
      onSelectCountry={handleSelect}
      secondaryFeeds={secondary}
      secondaryTitle="More political news"
      heading={heading}
      intro={intro}
    />
  );
}
