import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import LiveFeed from '@/components/feed/LiveFeed';
import { ALL_COUNTRIES, CountryConfig, findCountryBySlug, getCountrySlug } from '@/config/countries';
import { getLatestForCountry, getLatestWorld } from '@/lib/articles';
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site';

export const revalidate = 300;

interface Props {
  params: { countrySlug: string };
}

function resolve(slug: string): CountryConfig {
  const country = findCountryBySlug(slug);
  if (country) return country;
  // Old links like /ng → /nigeria
  const byCode = ALL_COUNTRIES.find((c) => c.code.toLowerCase() === slug.toLowerCase());
  if (byCode) permanentRedirect(`/${getCountrySlug(byCode)}`);
  return notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = findCountryBySlug(params.countrySlug);
  if (!country) return { title: 'Not found', robots: { index: false } };
  const articles = await getLatestForCountry(country.code, 12);
  const path = `/${getCountrySlug(country)}`;
  const title = `${country.name} Political News Today: Latest Updates & Analysis`;
  const lead = articles[0]?.title ? ` Latest: ${articles[0].title}.` : '';
  return {
    title,
    description: `Clear, original reporting on ${country.name} politics — government, elections, parties and policy, with what each story means.${lead}`.slice(0, 300),
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, url: absoluteUrl(path), type: 'website' },
    // Keep a country page out of Google until it lists at least one editor-approved story.
    robots: articles.some((a) => a.review_status === 'approved') ? undefined : { index: false, follow: true },
  };
}

export default async function CountryPage({ params }: Props) {
  const country = resolve(params.countrySlug);
  const [articles, world] = await Promise.all([getLatestForCountry(country.code, 40), getLatestWorld(country.code, 24)]);
  const path = `/${getCountrySlug(country)}`;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${country.name} political news`,
        url: absoluteUrl(path),
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: articles.slice(0, 20).map((a, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: absoluteUrl(`/news/${a.slug}`),
            name: a.title,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: country.name, item: absoluteUrl(path) },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <LiveFeed
        mode="country"
        initialCountryCode={country.code}
        initialArticles={articles}
        worldArticles={world}
        heading={`${country.name} political news`}
        intro={`The latest on ${country.name}'s government, elections, parties and policy, written in plain English with analysis of what each development means.`}
      />
    </>
  );
}
