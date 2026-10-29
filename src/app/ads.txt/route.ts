import { adsTxtLines } from '@/config/ads';

// ads.txt is generated from env vars, so it is correct the moment you add your AdSense / Monetag IDs.
export const dynamic = 'force-dynamic';

export async function GET() {
  const lines = adsTxtLines();
  const body = lines.length ? lines.join('\n') + '\n' : '# No ad networks configured yet.\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
