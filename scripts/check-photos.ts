/** Live test of the licensed-photo finder against Wikimedia Commons.  npx tsx scripts/check-photos.ts */
import { findLicensedPhoto } from '../src/lib/editorial/photos';

const CASES: string[][] = [
  ['Bola Tinubu'],
  ['Peter Obi'],
  ['Keir Starmer'],
  ['William Ruto'],
  ['John Mahama'],
  ['Cyril Ramaphosa'],
  ['Narendra Modi'],
  ['Anthony Albanese'],
  ['National Assembly of Nigeria'],
  ['Independent National Electoral Commission'],
  ['Zzxq Notarealperson'], // must find nothing
];

async function main() {
  const lines: string[] = [];
  for (const subjects of CASES) {
    const t = Date.now();
    const p = await findLicensedPhoto(subjects, 8000);
    lines.push(`${subjects[0]} → ${p ? `${p.license} | ${p.width}x${p.height} | ${p.credit.slice(0, 70)} | ${p.url.split('/').pop()?.slice(0, 60)}` : 'none (story card used)'} [${Date.now() - t}ms]`);
  }
  lines.forEach((l) => console.log(l));
  console.log(`::notice title=Photos::${lines.join('%0A')}`);
}
main();
