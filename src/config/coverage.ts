/**
 * Voxpolis coverage plan.
 *
 * Which countries we actively report on, how often, and from which publishers.
 * Chosen for: audience size, strong English-language political press,
 * search demand, and ad value. Everything else is picked up by the
 * WORLD desk, where the AI assigns the country.
 *
 * Tier 1 → polled every hour.  Tier 2 → every 6 hours.
 * Quality over volume: only importance 6+ stories, 1-2 per desk per run.
 * Feeds must be direct publisher feeds (not Google News redirect links),
 * otherwise the article page can't be read and rewritten.
 */

export interface SourceFeed {
  name: string;
  url: string;
}

export interface CoverageDesk {
  code: string;          // ISO country code, or 'WORLD'
  tier: 1 | 2;
  maxPerRun: number;     // new stories to publish per run
  feeds: SourceFeed[];
}

export const COVERAGE: CoverageDesk[] = [
  // Every outlet below was tested on 29 Oct 2026: feed readable AND article text extractable.
  // ---------- Tier 1 ----------
  {
    code: 'NG', tier: 1, maxPerRun: 2,
    feeds: [
      { name: 'Punch', url: 'https://punchng.com/topics/politics/feed/' },
      { name: 'Vanguard', url: 'https://www.vanguardngr.com/category/politics/feed/' },
      { name: 'Premium Times', url: 'https://www.premiumtimesng.com/category/news/politics/feed' },
      { name: 'Daily Post', url: 'https://dailypost.ng/politics/feed/' },
      { name: 'Channels TV', url: 'https://www.channelstv.com/feed/' },
    ],
  },
  {
    // Mix of outlets across the US political spectrum.
    code: 'US', tier: 1, maxPerRun: 2,
    feeds: [
      { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/politics' },
      { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/politics' },
      { name: 'ABC News', url: 'https://abcnews.go.com/abcnews/politicsheadlines' },
      { name: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/politics.xml' },
    ],
  },
  {
    code: 'GB', tier: 1, maxPerRun: 2,
    feeds: [
      { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/politics/rss.xml' },
      { name: 'The Guardian', url: 'https://www.theguardian.com/politics/rss' },
    ],
  },
  {
    code: 'GH', tier: 1, maxPerRun: 1,
    feeds: [
      { name: 'MyJoyOnline', url: 'https://www.myjoyonline.com/news/politics/feed/' },
      { name: 'Graphic Online', url: 'https://www.graphic.com.gh/news/politics.feed?type=rss' },
    ],
  },
  {
    code: 'KE', tier: 1, maxPerRun: 1,
    feeds: [
      { name: 'The Standard', url: 'https://www.standardmedia.co.ke/rss/politics.php' },
      { name: 'Capital FM', url: 'https://www.capitalfm.co.ke/news/category/kenya/politics/feed/' },
    ],
  },
  {
    code: 'ZA', tier: 1, maxPerRun: 1,
    feeds: [
      { name: 'Daily Maverick', url: 'https://www.dailymaverick.co.za/dmrss/' },
      { name: 'IOL', url: 'https://iol.co.za/rss/iol/news/politics/' },
    ],
  },
  {
    code: 'IN', tier: 1, maxPerRun: 1,
    feeds: [
      { name: 'Hindustan Times', url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml' },
      { name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-india-news' },
      { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms' },
    ],
  },
  {
    code: 'CA', tier: 1, maxPerRun: 1,
    feeds: [
      { name: 'Global News', url: 'https://globalnews.ca/politics/feed/' },
      { name: 'CBC News', url: 'https://www.cbc.ca/webfeed/rss/rss-politics' },
    ],
  },
  {
    code: 'AU', tier: 1, maxPerRun: 1,
    feeds: [
      { name: 'The Guardian Australia', url: 'https://www.theguardian.com/australia-news/australian-politics/rss' },
      { name: 'ABC News', url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
    ],
  },
  {
    code: 'WORLD', tier: 1, maxPerRun: 2,
    feeds: [
      { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
      { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
      { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
      { name: 'DW', url: 'https://rss.dw.com/rdf/rss-en-world' },
      { name: 'France 24', url: 'https://www.france24.com/en/rss' },
    ],
  },

  // ---------- Tier 2 ----------
  {
    code: 'UG', tier: 2, maxPerRun: 1,
    feeds: [
      { name: 'Nile Post', url: 'https://nilepost.co.ug/feed' },
      { name: 'The Independent', url: 'https://www.independent.co.ug/feed/' },
    ],
  },
  {
    code: 'ZW', tier: 2, maxPerRun: 1,
    feeds: [
      { name: 'NewZimbabwe', url: 'https://www.newzimbabwe.com/feed/' },
      { name: 'Nehanda Radio', url: 'https://nehandaradio.com/feed/' },
    ],
  },
  {
    code: 'IE', tier: 2, maxPerRun: 1,
    feeds: [
      { name: 'RTÉ News', url: 'https://www.rte.ie/feeds/rss/?index=/news/politics/' },
      { name: 'TheJournal.ie', url: 'https://www.thejournal.ie/feed/' },
    ],
  },
  {
    code: 'NZ', tier: 2, maxPerRun: 1,
    feeds: [{ name: 'RNZ', url: 'https://www.rnz.co.nz/rss/political.xml' }],
  },
  {
    code: 'PK', tier: 2, maxPerRun: 1,
    feeds: [
      { name: 'Dawn', url: 'https://www.dawn.com/feeds/home' },
      { name: 'The Express Tribune', url: 'https://tribune.com.pk/feed/pakistan' },
      { name: 'Geo News', url: 'https://www.geo.tv/rss/1/1' },
    ],
  },
  {
    code: 'PH', tier: 2, maxPerRun: 1,
    feeds: [
      { name: 'Philstar', url: 'https://www.philstar.com/rss/nation' },
      { name: 'GMA News', url: 'https://data.gmanetwork.com/gno/rss/news/nation/feed.xml' },
    ],
  },
];

export function getDesk(code: string): CoverageDesk | undefined {
  return COVERAGE.find((d) => d.code === code.toUpperCase());
}

export function deskCodesForTier(tier: 1 | 2): string[] {
  return COVERAGE.filter((d) => d.tier === tier).map((d) => d.code);
}

/** Countries that have a dedicated Voxpolis desk (excludes WORLD). */
export const COVERED_COUNTRY_CODES = COVERAGE.filter((d) => d.code !== 'WORLD').map((d) => d.code);
