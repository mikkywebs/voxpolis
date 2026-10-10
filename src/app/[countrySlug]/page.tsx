'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BentoFeedLayout from '@/components/bento/BentoFeedLayout';
import { CountryConfig, getCountrySlug, getCountryBySlug } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData } from '@/lib/news';
import { createClient } from '@/lib/supabase/client';

export default function CountryFeedPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const countrySlug = ((params?.countrySlug as string) || 'nigeria').toLowerCase();

  const initialCountry = getCountryBySlug(countrySlug);

  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(initialCountry);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(initialCountry.languages[0]?.code || 'en');
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Sync state if countrySlug URL param changes dynamically
  useEffect(() => {
    const matched = getCountryBySlug(countrySlug);
    setSelectedCountry(matched);
    const defaultLang = matched.languages[0]?.code || 'en';
    setSelectedLanguage(defaultLang);
  }, [countrySlug]);

  // Check auth status for guest vs member
  useEffect(() => {
    let authSub: any = null;

    async function checkAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user;
        const localActive = typeof window !== 'undefined' && localStorage.getItem('voxpolis_session_active') === 'true';
        const localName = typeof window !== 'undefined' && localStorage.getItem('voxpolis_user_name');
        const localEmail = typeof window !== 'undefined' && localStorage.getItem('voxpolis_user_email');

        if (sessionUser) {
          setUser({
            id: sessionUser.id,
            email: sessionUser.email,
            fullName: sessionUser.user_metadata?.full_name || localName || sessionUser.email?.split('@')[0] || 'Citizen',
          });
        } else if (localActive || localName) {
          setUser({
            id: 'local-member',
            email: localEmail || undefined,
            fullName: localName || 'Citizen',
          });
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              fullName: session.user.user_metadata?.full_name || 'Citizen',
            });
          } else if (typeof window !== 'undefined' && localStorage.getItem('voxpolis_session_active') === 'true') {
            setUser({
              id: 'local-member',
              fullName: localStorage.getItem('voxpolis_user_name') || 'Citizen',
            });
          } else {
            setUser(null);
          }
        });
        authSub = sub?.subscription;
      } catch (e) {
        if (typeof window !== 'undefined') {
          const localName = localStorage.getItem('voxpolis_user_name');
          if (localName || localStorage.getItem('voxpolis_session_active') === 'true') {
            setUser({
              id: 'local-member',
              fullName: localName || 'Citizen',
            });
          }
        }
      }
    }

    checkAuth();
    return () => {
      if (authSub) authSub.unsubscribe();
    };
  }, [supabase]);

  // Fetch articles when country or language changes
  useEffect(() => {
    async function loadNews() {
      setLoading(true);
      const data = await fetchArticlesForCountry(selectedCountry.code, selectedLanguage);
      setArticles(data);
      setLoading(false);
    }
    if (selectedCountry) {
      loadNews();
    }
  }, [selectedCountry, selectedLanguage]);

  const handleCountryChange = (c: CountryConfig) => {
    const slug = getCountrySlug(c);
    router.push(`/${slug}`);
  };

  return (
    <BentoFeedLayout
      selectedCountry={selectedCountry}
      articles={articles}
      loading={loading}
      user={user}
      onSelectCountry={handleCountryChange}
    />
  );
}
