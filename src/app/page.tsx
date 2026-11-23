import type { Metadata } from 'next';
import LiveFeed from '@/components/feed/LiveFeed';
import { getFeatured, getLatestForCountry } from '@/lib/articles';
import { ArticleData } from '@/lib/news';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} | Political News Explained — Nigeria, Africa & the World` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
};

// Editorial mix for every visitor: 70% Nigeria, 20% Africa, 10% World.
// Each block of 10 slots is N N A N N N A N N W; if a section runs out, the others fill in.
const FRESH_DAYS = 7;
const MIN_STORIES = 12;
const PATTERN = ['NG', 'NG', 'AFRICA', 'NG', 'NG', 'NG', 'AFRICA', 'NG', 'NG', 'WORLD'] as const;

function mix(pools: Record<string, ArticleData[]>, total: number): ArticleData[] {
  const queues: Record<string, ArticleData[]> = { NG: [...pools.NG], AFRICA: [...pools.AFRICA], WORLD: [...pools.WORLD] };
  const out: ArticleData[] = [];
  for (let i = 0; out.length < total && i < total * 3; i++) {
    const want = PATTERN[i % PATTERN.length];
    const pick = queues[want].shift() || queues.NG.shift() || queues.AFRICA.shift() || queues.WORLD.shift();
    if (!pick) break;
    out.push(pick);
  }
  return out;
}

export default async function HomePage() {
  const [ng, africa, world, featured] = await Promise.all([getLatestForCountry('NG', 28), getLatestForCountry('AFRICA', 10), getLatestForCountry('WORLD', 6), getFeatured(5)]);
  // Front page = fresh news only (last 7 days). Older stories stay on the section pages and in Google.
  // If a section has nothing fresh, Nigeria fills its slots; if fewer than 12 fresh stories exist, the newest older ones fill in.
  const cutoff = Date.now() - FRESH_DAYS * 24 * 3600_000;
  const fresh = (list: ArticleData[]) => list.filter((a) => new Date(a.created_at).getTime() >= cutoff);
  let articles = mix({ NG: fresh(ng), AFRICA: fresh(africa), WORLD: fresh(world) }, 40);
  if (articles.length < MIN_STORIES) {
    const have = new Set(articles.map((a) => a.id));
    const older = [...ng, ...africa, ...world]
      .filter((a) => !have.has(a.id))
      .sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
    articles = [...articles, ...older.slice(0, MIN_STORIES - articles.length)];
  }
  const shown = new Set(articles.map((a) => a.id));
  const more = fresh([...africa, ...world]).filter((a) => !shown.has(a.id));

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
        initialCountryCode="NG"
        initialArticles={articles}
        featuredArticles={featured}
        worldArticles={more}
        heading="Nigeria, Africa and world politics, explained"
        intro="Original reporting on today’s political stories: what happened, why it matters and what comes next."
      />
    </>
  );
}
