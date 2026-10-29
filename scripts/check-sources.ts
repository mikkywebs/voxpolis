/**
 * Source health check (no AI keys needed):
 * for every desk, read its feeds and try to extract the newest political story.
 *   npx tsx scripts/check-sources.ts
 */
import { COVERAGE } from '../src/config/coverage';
import { readFeeds, looksPolitical } from '../src/lib/editorial/feeds';
import { extractSourceArticle } from '../src/lib/editorial/extract';

async function main() {
  const lines: string[] = [];
  let healthy = 0;
  for (const desk of COVERAGE) {
    const { items, errors } = await readFeeds(desk.feeds);
    const cutoff = Date.now() - 36 * 3600_000;
    const fresh = items.filter((i) => new Date(i.publishedAt).getTime() >= cutoff && looksPolitical(i));
    const perFeed = desk.feeds
      .map((f) => {
        const n = items.filter((i) => i.feedUrl === f.url).length;
        const err = errors.find((e) => e.feed === f.name)?.error;
        return `${f.name}:${err ? 'ERR(' + err + ')' : n}`;
      })
      .join(', ');

    const tried: string[] = [];
    let extractedOk = 0;
    for (const item of fresh.slice(0, 3)) {
      const r = await extractSourceArticle(item.url, item.title);
      if (r.ok) extractedOk++;
      tried.push(r.ok ? `OK ${r.wordCount}w${r.imageUrl ? '+img' : ''}` : `FAIL ${r.reason}`);
    }
    if (extractedOk > 0) healthy++;
    lines.push(`${desk.code}: fresh political ${fresh.length}/${items.length} | feeds ${perFeed} | extract ${tried.join(' ; ') || 'none tried'}`);
  }
  const summary = `Desks able to publish: ${healthy}/${COVERAGE.length}`;
  console.log(summary);
  lines.forEach((l) => console.log(l));
  // GitHub annotation (readable via the checks API)
  const msg = [summary, ...lines].join('%0A');
  console.log(`::notice title=Source check::${msg}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
