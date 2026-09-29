import { processSourceUrlThroughPipeline } from '../src/lib/pipeline/index';
import { runBackfillJob } from '../src/lib/pipeline/backfill';
import { fetchArticlesForCountry } from '../src/lib/news';

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--url')) {
    const urlIdx = args.indexOf('--url') + 1;
    const url = args[urlIdx];

    if (!url) {
      console.error('Error: Please specify a URL: npm run pipeline -- --url "https://example.com/news"');
      process.exit(1);
    }

    console.log(`\n🤖 Processing Source URL through Voxpolis Automatic Pipeline: ${url}\n`);
    const result = await processSourceUrlThroughPipeline(url, 'CLI Source', 'CLI Input');

    console.log('Result Status:', result.status);
    console.log('Generated Slug:', result.slug);
    console.log('Headline:', result.headline);
    console.log('Word Count:', result.word_count);
    if (result.incomplete_reason) {
      console.log('Reason:', result.incomplete_reason);
    }
    return;
  }

  if (args.includes('--backfill')) {
    console.log('\n🔄 Running Voxpolis Automatic Pipeline Backfill Job...\n');
    const legacyArticles = await fetchArticlesForCountry('NG');
    const backfillResult = await runBackfillJob(legacyArticles);

    console.log('Backfill Summary:', JSON.stringify(backfillResult, null, 2));
    return;
  }

  console.log(`
Voxpolis Automatic Pipeline CLI Usage:
- Run single URL: npm run pipeline -- --url "https://news-site.com/article"
- Run backfill job: npm run pipeline -- --backfill
`);
}

main().catch((err) => {
  console.error('CLI Execution Error:', err);
  process.exit(1);
});
