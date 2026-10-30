/**
 * Source health check (no AI keys needed). Tests every outlet separately:
 * can we read its feed, and can we extract its newest political story?
 *   npx tsx scripts/check-sources.ts            → current coverage
 *   TRIAL=1 npx tsx scripts/check-sources.ts    → also test candidate replacement feeds
 */
import { COVERAGE, SourceFeed } from '../src/config/coverage';
import { readFeeds, looksPolitical } from '../src/lib/editorial/feeds';
import { extractSourceArticle } from '../src/lib/editorial/extract';

const TRIAL: Record<string, SourceFeed[]> = {
  NG: [
    { name: 'TheCable (all)', url: 'https://www.thecable.ng/feed' },
    { name: 'Channels (all)', url: 'https://www.channelstv.com/feed/' },
    { name: 'Guardian NG', url: 'https://guardian.ng/category/politics/feed/' },
  ],
  US: [
    { name: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/politics' },
    { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/politics' },
    { name: 'ABC News US', url: 'https://abcnews.go.com/abcnews/politicsheadlines' },
    { name: 'CNN', url: 'http://rss.cnn.com/rss/cnn_allpolitics.rss' },
    { name: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/politics.xml' },
  ],
  GH: [
    { name: 'Citi (all)', url: 'https://citinewsroom.com/feed/' },
    { name: 'Graphic', url: 'https://www.graphic.com.gh/news/politics.feed?type=rss' },
    { name: 'GhanaWeb news', url: 'https://www.ghanaweb.com/GhanaHomePage/rss/news.xml' },
    { name: '3News', url: 'https://3news.com/news/politics/feed/' },
  ],
  KE: [
    { name: 'The Standard', url: 'https://www.standardmedia.co.ke/rss/politics.php' },
    { name: 'Nation', url: 'https://nation.africa/kenya/rss.xml' },
    { name: 'KBC', url: 'https://www.kbc.co.ke/category/politics/feed/' },
    { name: 'Citizen Digital', url: 'https://www.citizen.digital/rss' },
    { name: 'The Star (all)', url: 'https://www.the-star.co.ke/rss' },
  ],
  ZA: [
    { name: 'Daily Maverick (all)', url: 'https://www.dailymaverick.co.za/dmrss/' },
    { name: 'News24 SA', url: 'https://feeds.news24.com/articles/news24/SouthAfrica/rss' },
    { name: 'News24 politics', url: 'https://feeds.news24.com/articles/news24/politics/rss' },
    { name: 'M&G (all)', url: 'https://mg.co.za/feed/' },
    { name: 'The Citizen', url: 'https://www.citizen.co.za/news/south-africa/politics/feed/' },
    { name: 'EWN', url: 'https://ewn.co.za/RSS%20Feeds/Latest%20News' },
    { name: 'SABC', url: 'https://www.sabcnews.com/sabcnews/category/politics/feed/' },
    { name: 'IOL', url: 'https://iol.co.za/rss/iol/news/politics/' },
  ],
  IN: [
    { name: 'Hindustan Times', url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml' },
    { name: 'India Today', url: 'https://www.indiatoday.in/rss/1206514' },
    { name: 'The Wire', url: 'https://thewire.in/rss' },
    { name: 'Scroll', url: 'https://scroll.in/feed' },
    { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms' },
  ],
  CA: [
    { name: 'CBC (webfeed)', url: 'https://www.cbc.ca/webfeed/rss/rss-politics' },
    { name: 'CTV', url: 'https://www.ctvnews.ca/rss/ctvnews-ca-politics-public-rss-1.822302' },
  ],
  UG: [
    { name: 'The Independent UG', url: 'https://www.independent.co.ug/feed/' },
    { name: 'Monitor', url: 'https://www.monitor.co.ug/uganda/rss.xml' },
    { name: 'New Vision', url: 'https://www.newvision.co.ug/rss' },
  ],
  ZW: [
    { name: 'ZimLive', url: 'https://www.zimlive.com/feed/' },
    { name: 'The Herald', url: 'https://www.herald.co.zw/feed/' },
    { name: 'NewsDay', url: 'https://www.newsday.co.zw/feed' },
    { name: 'Nehanda Radio', url: 'https://nehandaradio.com/feed/' },
  ],
  PK: [
    { name: 'Geo News', url: 'https://www.geo.tv/rss/1/1' },
    { name: 'The News', url: 'https://www.thenews.com.pk/rss/1/1' },
    { name: 'ARY News', url: 'https://arynews.tv/feed/' },
  ],
  PH: [
    { name: 'GMA News', url: 'https://data.gmanetwork.com/gno/rss/news/nation/feed.xml' },
    { name: 'Philstar', url: 'https://www.philstar.com/rss/nation' },
    { name: 'Manila Bulletin', url: 'https://mb.com.ph/rss/news' },
  ],
};

async function checkOutlet(feed: SourceFeed): Promise<string> {
  const { items, errors } = await readFeeds([feed]);
  if (errors.length) return `${feed.name}: FEED ${errors[0].error}`;
  const cutoff = Date.now() - 36 * 3600_000;
  const fresh = items.filter((i) => new Date(i.publishedAt).getTime() >= cutoff && looksPolitical(i));
  if (!fresh.length) return `${feed.name}: feed ok (${items.length}) but 0 fresh political`;
  const results: string[] = [];
  for (const item of fresh.slice(0, 2)) {
    const r = await extractSourceArticle(item.url, item.title);
    results.push(r.ok ? `OK ${r.wordCount}w` : `FAIL ${r.reason}`);
    if (r.ok) break;
  }
  return `${feed.name}: ${fresh.length} fresh | ${results.join(' ; ')}`;
}

async function main() {
  const out: string[] = [];
  const desks = COVERAGE.map((d) => ({ code: d.code, feeds: [...d.feeds, ...(process.env.TRIAL ? TRIAL[d.code] || [] : [])] }));
  for (const d of desks) {
    const res = await Promise.all(d.feeds.map(checkOutlet));
    out.push(`${d.code} → ${res.join(' || ')}`);
  }
  out.forEach((l) => console.log(l));
  // One annotation per ~4 desks keeps each message readable via the checks API.
  for (let i = 0; i < out.length; i += 4) {
    console.log(`::notice title=Sources ${i / 4 + 1}::${out.slice(i, i + 4).join('%0A')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
