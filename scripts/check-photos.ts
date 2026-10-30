/** Live test of the licensed-photo finder against Wikimedia Commons.  npx tsx scripts/check-photos.ts */
import { findLicensedPhoto } from '../src/lib/editorial/photos';

const CASES: [string, string][] = [
  ['Bola Tinubu', 'Nigeria'],
  ['Peter Obi', 'Nigeria'],
  ['Keir Starmer', ''],
  ['William Ruto', ''],
  ['John Mahama', ''],
  ['Kemi Badenoch', ''],
  ['Donald Trump', ''],
  ['Cyril Ramaphosa', ''],
  ['Narendra Modi', ''],
  ['Anthony Albanese', ''],
  ['National Assembly of Nigeria', 'Nigeria'],
  ['Independent National Electoral Commission', 'Nigeria'],
  ['Lekki', 'Nigeria'], // too vague: must find nothing
  ['Dangote Petroleum Refinery', 'Nigeria'],
  ['Zzxq Notarealperson', ''], // must find nothing
];

async function main() {
  const lines: string[] = [];
  for (const [name, country] of CASES) {
    const subjects = [name];
    const t = Date.now();
    const debug: string[] = [];
    const p = await findLicensedPhoto(subjects, 12000, debug, country || undefined);
    if (!p && !subjects[0].startsWith('Zzxq')) console.log(`::notice title=Why ${subjects[0]}::${debug.slice(0, 14).join('%0A')}`);
    lines.push(`${subjects[0]} → ${p ? `${p.license} | ${p.width}x${p.height} | ${p.credit.slice(0, 70)} | ${p.url.split('/').pop()?.slice(0, 60)}` : 'none (story card used)'} [${Date.now() - t}ms]`);
  }
  lines.forEach((l) => console.log(l));
  console.log(`::notice title=Photos::${lines.join('%0A')}`);
}
main();
