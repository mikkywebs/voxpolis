/**
 * Voxpolis coverage plan.
 *
 * Focus (Nov 2026): at most 20 Nigeria, 5 Africa, 5 World drafts a day (maximums, not targets).
 * Three desks: NG (Nigerian politics), AFRICA (politics in other African countries, AU, ECOWAS),
 * WORLD (everything else, and relations between countries).
 * Sized for the free AI allowance: at most 30 drafts a day in total (INGEST_DAILY_CAP),
 * paced through the day, with a cap on AI attempts so rejected drafts can't use up the allowance.
 * Feeds must be direct publisher feeds (not Google News redirect links),
 * otherwise the article page can't be read and rewritten.
 */

export interface SourceFeed {
  name: string;
  url: string;
}

export interface CoverageDesk {
  code: string;          // 'NG', 'AFRICA' or 'WORLD'
  tier: 1 | 2;
  maxPerRun: number;     // new drafts per run
  dailyCap: number;      // new drafts per day (paced across the day)
  feeds: SourceFeed[];
}

// Tested 4 Nov 2026 (feed + article text readable). Not usable (they block automatic reading):
// TheCable (403), The Guardian Nigeria (403), BusinessDay (no readable text), Africanews (406).
export const COVERAGE: CoverageDesk[] = [
  {
    // Several outlets so different leanings balance each other; official statements come through their reports.
    code: 'NG', tier: 1, maxPerRun: 2, dailyCap: 20,
    feeds: [
      { name: 'Premium Times', url: 'https://www.premiumtimesng.com/category/news/politics/feed' },
      { name: 'Punch', url: 'https://punchng.com/topics/politics/feed/' },
      { name: 'Vanguard', url: 'https://www.vanguardngr.com/category/politics/feed/' },
      { name: 'Channels TV', url: 'https://www.channelstv.com/feed/' },
      { name: 'Daily Trust', url: 'https://dailytrust.com/topics/politics/feed/' },
      { name: 'Daily Post', url: 'https://dailypost.ng/politics/feed/' },
    ],
  },
  {
    // Politics in other African countries, the African Union and ECOWAS.
    code: 'AFRICA', tier: 1, maxPerRun: 1, dailyCap: 5,
    feeds: [
      { name: 'BBC News Africa', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml' },
      { name: 'The Africa Report', url: 'https://www.theafricareport.com/feed/' },
      { name: 'MyJoyOnline', url: 'https://www.myjoyonline.com/news/politics/feed/' },
      { name: 'Capital FM', url: 'https://www.capitalfm.co.ke/news/category/kenya/politics/feed/' },
      { name: 'Daily Maverick', url: 'https://www.dailymaverick.co.za/dmrss/' },
    ],
  },
  {
    code: 'WORLD', tier: 1, maxPerRun: 1, dailyCap: 5,
    feeds: [
      { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
      { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
      { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
      { name: 'France 24', url: 'https://www.france24.com/en/rss' },
      { name: 'DW', url: 'https://rss.dw.com/rdf/rss-en-world' },
    ],
  },
];

export function getDesk(code: string): CoverageDesk | undefined {
  return COVERAGE.find((d) => d.code === code.toUpperCase());
}

export function deskCodesForTier(tier: 1 | 2): string[] {
  return COVERAGE.filter((d) => d.tier === tier).map((d) => d.code);
}

/** The site's sections, in desk order: NG, AFRICA (WORLD is added by countries.ts). */
export const COVERED_COUNTRY_CODES = COVERAGE.filter((d) => d.code !== 'WORLD').map((d) => d.code);
