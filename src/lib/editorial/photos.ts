/**
 * Licensed photos from Wikimedia Commons.
 *
 * Rules (so every photo we show is legal to use commercially):
 * - Only Public Domain, CC0, CC BY and CC BY-SA licences. Anything else is skipped.
 * - The credit line (author + licence + link) is stored and shown wherever the photo appears.
 * - For a person, the file's title or description must contain their surname,
 *   so we don't show the wrong person.
 * - Logos, maps, flags, coats of arms, signatures, charts and documents are skipped.
 * Publisher photos are never used.
 */

export interface LicensedPhoto {
  url: string;
  width: number;
  height: number;
  credit: string;   // e.g. "Photo: Jane Doe / CC BY-SA 4.0 via Wikimedia Commons"
  license: string;  // e.g. "CC BY-SA 4.0"
  pageUrl: string;  // Commons file page (licence details)
  subject: string;  // what we searched for
}

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'VoxpolisBot/2.0 (https://www.voxpolis.app/how-we-report; contact@voxpolis.app)';

// Licences that allow commercial reuse with attribution (or none needed).
const ALLOWED_LICENSE = /^(public domain|pd\b|pd-|cc0|cc[ -]by(-sa)?([ -]\d(\.\d)?)?( igo)?\b|attribution|ogl|open government licence|godl)/i;
const BLOCKED_LICENSE = /\b(nc|nd|non-?commercial|no ?deriv|fair use|copyrighted)\b/i;
const BAD_FILE = /(logo|\bmap\b|flag|coat of arms|emblem|seal of|signature|chart|graph|diagram|locator|banner|icon|symbol|document|screenshot|poster|cover|ballot paper|stamp|coin|banknote|cartoon|caricature|\.svg|\.pdf|\.tif)/i;
// Titles that suggest the person is not the main subject (meetings, other leaders' photos).
// Includes Portuguese/French/Spanish/German/Italian captions, which are common on Commons.
const NOT_MAIN_SUBJECT = /\b(receives?|received|meets?|meeting|met with|with|and|visit(s|ing)?|talks|summit|delegation|bilateral|greets?|welcom(es|ing)|shakes?|vs\.?|versus|family|wife|husband|funeral|reuni[aã]o|r[ée]union|reuni[oó]n|encontro|encuentro|rencontre|treffen|incontro|entre|com|avec|con|und|mit|ampliada|cumbre|cimeira|sommet|gipfel)\b/i;
// For institutions/places we want the building or chamber, not a portrait of an office-holder.
const PERSON_TITLE = /\b(chairman|chairperson|chair|professor|prof|dr|mr|mrs|ms|hon|sen|president|minister|governor|senator|speaker|commissioner|portrait|headshot)\b/i;
const EVENT_HINT = /\b(ceremony|cerim[oô]nia|ceremonia|c[ée]r[ée]monie|arrival|chegada|llegada|arriv[ée]e|departure|inauguration of|state visit|official visit)\b/i;
const PORTRAIT_HINT = /\b(portrait|official|headshot|cropped|profile)\b/i;

function strip(html?: string): string {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Very rough "is this a person's name?" check: 2-4 capitalised words, no institution words. */
function looksLikePerson(subject: string): boolean {
  if (/\b(party|parliament|assembly|senate|house|court|commission|ministry|government|council|congress|union|bank|police|army|agency|office|state|federal|national|republic|university)\b/i.test(subject)) return false;
  const words = subject.trim().split(/\s+/);
  return words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Z][A-Za-z\u00C0-\u024F'.-]*$/.test(w));
}

async function search(query: string, signal: AbortSignal): Promise<any[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata|mime',
    iiurlwidth: '1200',
    iiextmetadatafilter: 'LicenseShortName|License|Artist|Credit|ImageDescription|ObjectName|UsageTerms|Restrictions',
  });
  const res = await fetch(`${API}?${params}`, { signal, headers: { 'User-Agent': UA, 'Api-User-Agent': UA }, cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  const pages: any[] = data?.query?.pages || [];
  return pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

type Verdict = { photo: LicensedPhoto | null; score: number; reason: string; title: string };

function evaluate(page: any, subject: string, person: boolean, countryName?: string, loose = false): Verdict {
  const title: string = page?.title || '';
  const no = (reason: string): Verdict => ({ photo: null, score: -99, reason, title });
  const info = page?.imageinfo?.[0];
  if (!info) return no('no imageinfo');
  const meta = info.extmetadata || {};
  const license = strip(meta.LicenseShortName?.value);

  if (!/^image\/(jpeg|png|webp)$/.test(info.mime || '')) return no(`mime ${info.mime}`);
  if (BAD_FILE.test(title)) return no('not a photo (logo/map/flag…)');
  if (!license || !ALLOWED_LICENSE.test(license) || BLOCKED_LICENSE.test(license)) return no(`licence "${license}"`);
  if ((info.width || 0) < 600 || (info.height || 0) < 400) return no(`too small ${info.width}x${info.height}`);
  const ratio = info.width / info.height;
  if (ratio < 0.55 || ratio > 2.6) return no(`odd shape ${ratio.toFixed(2)}`);

  const cleanTitle = normalise(title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''));
  const haystack = normalise(`${title} ${strip(meta.ImageDescription?.value)} ${strip(meta.ObjectName?.value)}`);
  const words = normalise(subject).split(' ').filter((w) => w.length > 2);
  const full = normalise(subject);
  let score = 0;

  if (loose) {
    // Editor's own search words: only licence and quality rules, plus at least one search word in the file.
    if (!words.some((w) => haystack.includes(w))) return no('search words not in file');
    score = 3 + words.filter((w) => cleanTitle.includes(w)).length;
  } else if (person) {
    const surname = words[words.length - 1];
    if (!surname || !haystack.includes(surname)) return no('name not in file');
    if (cleanTitle.includes(full)) score += 5;
    else if (cleanTitle.includes(surname)) score += 3;
    else score += 1; // only in description
    const at = cleanTitle.indexOf(surname);
    if (at >= 0 && at <= 30) score += 3; // the person is named first → usually the main subject
    if (EVENT_HINT.test(title)) score -= 3;
    if (PORTRAIT_HINT.test(title)) score += 3;
    if (/\(cropped/i.test(title)) score += 1;
    if (NOT_MAIN_SUBJECT.test(title.replace(/^File:/, '')) || /\s&\s|%26/.test(title)) score -= 6;
    if (cleanTitle.length > 90) score -= 2; // long captions are usually event photos with several people
  } else {
    // Institutions and places must match the full name, so "Electoral Commission of Afghanistan"
    // can never stand in for Nigeria's INEC.
    if (words.length < 2) return no('place/institution name too vague (needs 2+ words)');
    if (!haystack.includes(full)) return no('full name not in file');
    // "Oyin in Lekki, Lagos" = a named person at a place, not the place itself.
    if (/^File:[A-Z][a-z]+( [A-Z][a-z]+)? (in|at|visits?|near) /.test(title)) return no('a person at the place');
    // Many countries share institution names (e.g. "Independent National Electoral Commission").
    if (countryName && !full.includes(normalise(countryName)) && !haystack.includes(normalise(countryName))) return no(`not about ${countryName}`);
    if (PERSON_TITLE.test(title)) return no('a person, not the institution');
    score += 3 + (cleanTitle.includes(full) ? 3 : 0);
    if (ratio >= 1.2) score += 1;
  }
  if (score < 3) return no(`weak match (score ${score})`);

  const artist = strip(meta.Artist?.value).slice(0, 80) || 'Unknown author';
  const url: string = (info.thumburl || info.url || '').split('?')[0];
  if (!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(url)) return no(`unexpected host: ${String(info.thumburl || info.url).slice(0, 60)}`);

  return {
    score,
    reason: 'ok',
    title,
    photo: {
      url,
      width: info.thumbwidth || info.width,
      height: info.thumbheight || info.height,
      license,
      credit: `Photo: ${artist} / ${license} via Wikimedia Commons`,
      pageUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
      subject,
    },
  };
}

async function bestFor(subject: string, signal: AbortSignal, debug?: string[], countryName?: string): Promise<LicensedPhoto | null> {
  const person = looksLikePerson(subject);
  const queries = person ? [`intitle:"${subject}"`, `"${subject}"`] : [`intitle:"${subject}"`, subject];
  for (const q of queries) {
    const verdicts = (await search(q, signal)).map((p) => evaluate(p, subject, person, countryName));
    verdicts.forEach((v) => debug?.push(`  [${q}] ${v.title.slice(0, 70)} → ${v.reason}${v.photo ? ` (score ${v.score})` : ''}`));
    const best = verdicts.filter((v) => v.photo).sort((a, b) => b.score - a.score)[0];
    if (best?.photo) return best.photo;
  }
  return null;
}

/** Try each subject in order (most specific first). Gives up quietly after `budgetMs`. */
export async function findLicensedPhoto(
  subjects: string[],
  budgetMs = 4500,
  debug?: string[],
  countryName?: string
): Promise<LicensedPhoto | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);
  try {
    const unique = Array.from(new Set(subjects.map((s) => s.trim()).filter((s) => s.length > 2))).slice(0, 4);
    for (const subject of unique) {
      const photo = await bestFor(subject, controller.signal, debug, countryName);
      if (photo) return photo;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Several licensed options for the editor to choose from ("Find a free photo").
 * Same licence and quality rules as the automatic pick; nothing is applied until the editor clicks.
 */
export async function findPhotoOptions(subjects: string[], max = 6, budgetMs = 9000, countryName?: string, loose = false): Promise<(LicensedPhoto & { score: number })[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);
  const found: (LicensedPhoto & { score: number })[] = [];
  try {
    const unique = Array.from(new Set(subjects.map((s) => s.trim()).filter((s) => s.length > 2))).slice(0, 3);
    await Promise.all(
      unique.map(async (subject, rank) => {
        const person = !loose && looksLikePerson(subject);
        const queries = loose ? [subject, `intitle:${subject}`] : person ? [`intitle:"${subject}"`, `"${subject}"`] : [`intitle:"${subject}"`, subject];
        for (const q of queries) {
          try {
            (await search(q, controller.signal)).forEach((p) => {
              const v = evaluate(p, subject, person, countryName, loose);
              // Earlier subjects (the main person) rank higher.
              if (v.photo) found.push({ ...v.photo, score: v.score - rank * 2 });
            });
          } catch {}
        }
      })
    );
  } finally {
    clearTimeout(timer);
  }
  const seen = new Set<string>();
  return found
    .sort((a, b) => b.score - a.score)
    .filter((p) => (seen.has(p.url) ? false : (seen.add(p.url), true)))
    .slice(0, max);
}
