/**
 * Voxpolis coverage plan.
 *
 * Which countries we actively report on, how often, and from which publishers.
 * Chosen for: audience size, strong English-language political press,
 * search demand, and ad value. Everything else is picked up by the
 * WORLD desk, where the AI assigns the country.
 *
 * Tier 1 → polled every hour.  Tier 2 → every 3 hours.
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
  // ---------- Tier 1 ----------
  {
    code: 'NG', tier: 1, maxPerRun: 3,
    feeds: [
      { name: 'Premium Times', url: 'https://www.premiumtimesng.com/category/news/politics/feed' },
      { name: 'TheCable', url: 'https://www.thecable.ng/category/politics/feed' },
      { name: 'Vanguard', url: 'https://www.vanguardngr.com/category/politics/feed/' },
      { name: 'Punch', url: 'https://punchng.com/topics/politics/feed/' },
      { name: 'Channels TV', url: 'https://www.channelstv.com/category/politics/feed/' },
      { name: 'Daily Post', url: 'https://dailypost.ng/politics/feed/' },
    ],
  },
  {
    code: 'US', tier: 1, maxPerRun: 3,
    feeds: [
      { name: 'Politico', url: 'https://rss.politico.com/politics-news.xml' },
      { name: 'NPR Politics', url: 'https://feeds.npr.org/1014/rss.xml' },
      { name: 'The Hill', url: 'https://thehill.com/homenews/feed/' },
      { name: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/feeds/rss/politics' },
    ],
  },
  {
    code: 'GB', tier: 1, maxPerRun: 3,
    feeds: [
      { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/politics/rss.xml' },
      { name: 'The Guardian', url: 'https://www.theguardian.com/politics/rss' },
      { name: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/politics.xml' },
    ],
  },
  {
    code: 'GH', tier: 1, maxPerRun: 2,
    feeds: [
      { name: 'Citi Newsroom', url: 'https://citinewsroom.com/category/news/politics/feed/' },
      { name: 'MyJoyOnline', url: 'https://www.myjoyonline.com/news/politics/feed/' },
      { name: 'GhanaWeb', url: 'https://www.ghanaweb.com/GhanaHomePage/rss/feed.php?cat=politics' },
    ],
  },
  {
    code: 'KE', tier: 1, maxPerRun: 2,
    feeds: [
      { name: 'Capital FM', url: 'https://www.capitalfm.co.ke/news/category/kenya/politics/feed/' },
      { name: 'The Star', url: 'https://www.the-star.co.ke/rss/politics' },
      { name: 'Kenyans.co.ke', url: 'https://www.kenyans.co.ke/feeds/news' },
    ],
  },
  {
    code: 'ZA', tier: 1, maxPerRun: 2,
    feeds: [
      { name: 'Daily Maverick', url: 'https://www.dailymaverick.co.za/section/south-africa/feed/' },
      { name: 'News24', url: 'https://feeds.24.com/articles/news24/SouthAfrica/rss' },
      { name: 'Mail & Guardian', url: 'https://mg.co.za/politics/feed/' },
    ],
  },
  {
    code: 'IN', tier: 1, maxPerRun: 2,
    feeds: [
      { name: 'The Hindu', url: 'https://www.thehindu.com/news/national/feeder/default.rss' },
      { name: 'Indian Express', url: 'https://indianexpress.com/section/political-pulse/feed/' },
      { name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-india-news' },
    ],
  },
  {
    code: 'CA', tier: 1, maxPerRun: 2,
    feeds: [
      { name: 'CBC News', url: 'https://www.cbc.ca/cmlink/rss-politics' },
      { name: 'Global News', url: 'https://globalnews.ca/politics/feed/' },
    ],
  },
  {
    code: 'AU', tier: 1, maxPerRun: 2,
    feeds: [
      { name: 'ABC News', url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
      { name: 'The Guardian Australia', url: 'https://www.theguardian.com/australia-news/australian-politics/rss' },
    ],
  },
  {
    code: 'WORLD', tier: 1, maxPerRun: 3,
    feeds: [
      { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
      { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
      { name: 'DW', url: 'https://rss.dw.com/rdf/rss-en-world' },
      { name: 'France 24', url: 'https://www.france24.com/en/rss' },
      { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
    ],
  },

  // ---------- Tier 2 ----------
  {
    code: 'UG', tier: 2, maxPerRun: 2,
    feeds: [
      { name: 'Nile Post', url: 'https://nilepost.co.ug/feed' },
      { name: 'ChimpReports', url: 'https://chimpreports.com/feed/' },
    ],
  },
  {
    code: 'ZW', tier: 2, maxPerRun: 2,
    feeds: [
      { name: 'NewZimbabwe', url: 'https://www.newzimbabwe.com/feed/' },
      { name: 'NewsDay', url: 'https://www.newsday.co.zw/feed' },
    ],
  },
  {
    code: 'IE', tier: 2, maxPerRun: 2,
    feeds: [
      { name: 'RTÉ News', url: 'https://www.rte.ie/feeds/rss/?index=/news/politics/' },
      { name: 'TheJournal.ie', url: 'https://www.thejournal.ie/feed/' },
    ],
  },
  {
    code: 'NZ', tier: 2, maxPerRun: 2,
    feeds: [
      { name: 'RNZ', url: 'https://www.rnz.co.nz/rss/political.xml' },
    ],
  },
  {
    code: 'PK', tier: 2, maxPerRun: 2,
    feeds: [
      { name: 'Dawn', url: 'https://www.dawn.com/feeds/home' },
      { name: 'The Express Tribune', url: 'https://tribune.com.pk/feed/pakistan' },
    ],
  },
  {
    code: 'PH', tier: 2, maxPerRun: 2,
    feeds: [
      { name: 'Rappler', url: 'https://www.rappler.com/nation/feed/' },
      { name: 'Inquirer', url: 'https://newsinfo.inquirer.net/category/nation/feed' },
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
