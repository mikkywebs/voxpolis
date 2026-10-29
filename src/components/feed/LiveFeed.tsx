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

async function fetchCountry(code: string): Promise<ArticleData[]> {
  try {
    const res = await fetch(`/api/news?country=${code}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.articles) ? data.articles : [];
  } catch {
    return [];
  }
}

function rememberCountry(code: string) {
  try {
    document.cookie = `voxpolis_country=${code}; path=/; max-age=31536000; samesite=lax`;
    localStorage.setItem('voxpolis_primary_country', code);
  } catch {}
}

/**
 * Feed page shell. The server already rendered the articles (good for Google);
 * this only adds the signed-in member's personal choices on top.
 */
export default function LiveFeed({ mode, initialCountryCode, initialArticles, worldArticles, heading, intro }: LiveFeedProps) {
  const router = useRouter();
  const [country, setCountry] = useState<CountryConfig>(getCountryByCode(initialCountryCode));
  const [articles, setArticles] = useState<ArticleData[]>(initialArticles);
  const [user, setUser] = useState<any>(null);
  const [followed, setFollowed] = useState<Feed[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let sub: { unsubscribe: () => void } | undefined;

    async function load(sessionUser: any) {
      if (!sessionUser) {
        setUser(null);
        setFollowed([]);
        return;
      }
      const meta = sessionUser.user_metadata || {};
      const u = {
        id: sessionUser.id,
        email: sessionUser.email,
        fullName: meta.full_name || sessionUser.email?.split('@')[0] || 'Member',
        primaryCountry: meta.primary_country,
        followedCountries: Array.isArray(meta.followed_countries) ? meta.followed_countries : [],
      };
      setUser(u);

      // Members: homepage follows their own primary country.
      if (mode === 'home' && u.primaryCountry && u.primaryCountry !== initialCountryCode) {
        setCountry(getCountryByCode(u.primaryCountry));
        setArticles(await fetchCountry(u.primaryCountry));
      }

      const codes: string[] = u.followedCountries.filter((c: string) => c !== (mode === 'home' ? u.primaryCountry || initialCountryCode : initialCountryCode)).slice(0, 5);
      const feeds = await Promise.all(codes.map(async (c) => ({ country: getCountryByCode(c), articles: (await fetchCountry(c)).slice(0, 3) })));
      setFollowed(feeds.filter((f) => f.articles.length > 0));
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

  const worldFeeds = groupByCountry(worldArticles.filter((a) => a.country_code !== country.code));
  const secondary = user && followed.length > 0 ? followed : worldFeeds;

  return (
    <BentoFeedLayout
      selectedCountry={country}
      articles={articles}
      loading={false}
      user={user}
      onSelectCountry={handleSelect}
      secondaryFeeds={secondary}
      secondaryTitle={user && followed.length > 0 ? 'Countries you follow' : 'Around the world'}
      heading={mode === 'home' && country.code !== initialCountryCode ? `${country.name} political news` : heading}
      intro={intro}
    />
  );
}
