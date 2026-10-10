'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BentoFeedLayout from '@/components/bento/BentoFeedLayout';
import { createClient } from '@/lib/supabase/client';
import { CountryConfig, getCountryByCode, getCountrySlug } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData } from '@/lib/news';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(getCountryByCode('NG'));
  const [allArticles, setAllArticles] = useState<ArticleData[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);

  // Registered user multi-country followed feeds
  const [followedCountryFeeds, setFollowedCountryFeeds] = useState<
    Array<{ country: CountryConfig; articles: ArticleData[] }>
  >([]);

  // Guest global reference feeds
  const [guestGlobalFeeds, setGuestGlobalFeeds] = useState<
    Array<{ country: CountryConfig; articles: ArticleData[] }>
  >([]);

  // Check Supabase session & user profile
  useEffect(() => {
    let authSub: any = null;

    async function checkAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user;

        const localName = localStorage.getItem('voxpolis_user_name');
        const localEmail = localStorage.getItem('voxpolis_user_email');
        const localCountry = localStorage.getItem('voxpolis_primary_country');
        let localFollowed: string[] = [];
        try {
          const parsed = JSON.parse(localStorage.getItem('voxpolis_followed_countries') || '[]');
          if (Array.isArray(parsed)) localFollowed = parsed;
        } catch {}

        if (sessionUser) {
          const name = sessionUser.user_metadata?.full_name || localName || sessionUser.email?.split('@')[0] || 'Citizen';
          const primary = sessionUser.user_metadata?.primary_country || localCountry || 'NG';
          const followed = sessionUser.user_metadata?.followed_countries || localFollowed;

          setUser({
            id: sessionUser.id,
            email: sessionUser.email,
            fullName: name,
            primaryCountry: primary,
            followedCountries: Array.isArray(followed) ? followed : [],
          });
        } else if (localName || localStorage.getItem('voxpolis_session_active') === 'true') {
          setUser({
            id: 'local-member',
            fullName: localName || 'Citizen',
            email: localEmail || undefined,
            primaryCountry: localCountry || 'NG',
            followedCountries: localFollowed,
          });
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          const u = session?.user;
          if (u) {
            const name = u.user_metadata?.full_name || localStorage.getItem('voxpolis_user_name') || u.email?.split('@')[0] || 'Citizen';
            setUser({
              id: u.id,
              email: u.email,
              fullName: name,
              primaryCountry: u.user_metadata?.primary_country || localStorage.getItem('voxpolis_primary_country') || 'NG',
              followedCountries: u.user_metadata?.followed_countries || [],
            });
          }
        });
        authSub = sub?.subscription;
      } catch {}
    }

    checkAuth();
    return () => {
      if (authSub) authSub.unsubscribe();
    };
  }, [supabase]);

  // Load Primary and Secondary News Feeds
  useEffect(() => {
    async function detectLocationAndLoadNews() {
      setLoadingArticles(true);
      let targetCode = 'NG';

      // 1. If registered member, prioritize saved primary country
      if (user?.primaryCountry) {
        targetCode = user.primaryCountry;
      } else {
        const savedCountry = typeof window !== 'undefined' ? localStorage.getItem('voxpolis_primary_country') : null;
        if (savedCountry) {
          targetCode = savedCountry;
        } else {
          // First-time guest: IP Geolocation
          try {
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
              const data = await res.json();
              if (data.country_code) targetCode = data.country_code;
            }
          } catch {
            try {
              const res2 = await fetch('https://ip-api.com/json/');
              if (res2.ok) {
                const data2 = await res2.json();
                if (data2.countryCode) targetCode = data2.countryCode;
              }
            } catch {
              targetCode = 'NG';
            }
          }
        }
      }

      const matchedCountry = getCountryByCode(targetCode);
      setSelectedCountry(matchedCountry);

      // 2. Fetch Primary Country Articles
      const primaryData = await fetchArticlesForCountry(matchedCountry.code);
      setAllArticles(primaryData);
      setLoadingArticles(false);

      // 3. Fetch Secondary Feeds (Followed Countries or Global Dispatches)
      if (user) {
        const followedCodes: string[] = Array.isArray(user.followedCountries) ? user.followedCountries : [];
        if (followedCodes.length > 0) {
          const promises = followedCodes.slice(0, 5).map(async (code) => {
            const countryObj = getCountryByCode(code);
            const list = await fetchArticlesForCountry(code);
            return {
              country: countryObj,
              articles: list.slice(0, 4),
            };
          });
          const results = await Promise.all(promises);
          setFollowedCountryFeeds(results.filter((r) => r.articles.length > 0));
        } else {
          setFollowedCountryFeeds([]);
        }
      } else {
        // Guest mode: fetch 2 global reference desks
        const globalCandidates = ['US', 'GB', 'ZA', 'GH', 'NG'].filter((c) => c !== matchedCountry.code).slice(0, 2);
        const promises = globalCandidates.map(async (code) => {
          const countryObj = getCountryByCode(code);
          const list = await fetchArticlesForCountry(code);
          return {
            country: countryObj,
            articles: list.slice(0, 3),
          };
        });
        const results = await Promise.all(promises);
        setGuestGlobalFeeds(results.filter((r) => r.articles.length > 0));
      }
    }

    detectLocationAndLoadNews();
  }, [user]);

  const handleSelectCountry = (c: CountryConfig) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('voxpolis_primary_country', c.code);
      if (c.languages?.length > 0) {
        localStorage.setItem('voxpolis_preferred_language', c.languages[0].code);
      }
    }
    const slug = getCountrySlug(c);
    router.push(`/${slug}`);
  };

  return (
    <BentoFeedLayout
      selectedCountry={selectedCountry}
      articles={allArticles}
      loading={loadingArticles}
      user={user}
      onSelectCountry={handleSelectCountry}
      secondaryFeeds={user ? followedCountryFeeds : guestGlobalFeeds}
    />
  );
}
