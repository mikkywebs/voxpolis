import type { Metadata } from 'next';
import LiveFeed from '@/components/feed/LiveFeed';
import { getCountryByCode } from '@/config/countries';
import { getLatestForCountry, getLatestWorld } from '@/lib/articles';
import { getVisitorCountryCode } from '@/lib/geo';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | Political News Explained — Nigeria, Africa & the World` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const code = getVisitorCountryCode();
  const country = getCountryByCode(code);
  const [articles, world] = await Promise.all([getLatestForCountry(country.code, 40), getLatestWorld(country.code, 24)]);

  const orgLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsMediaOrganization',
        '@id': `${SITE_URL}/#org`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/voxpolis-icon.png` },
        correctionsPolicy: `${SITE_URL}/corrections`,
        publishingPrinciples: `${SITE_URL}/about`,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': `${SITE_URL}/#org` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <LiveFeed
        mode="home"
        initialCountryCode={country.code}
        initialArticles={articles}
        worldArticles={world}
        heading={`${country.name} political news, explained`}
        intro="Original reporting on today’s political stories: what happened, why it matters and what comes next."
      />
    </>
  );
}
