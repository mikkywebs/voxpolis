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

const ALLOWED_LICENSE = /^(public domain|pd\b|pd-|cc0|cc by(-sa)? \d(\.\d)?|cc by(-sa)?$|cc-by(-sa)?-\d)/i;
const BLOCKED_LICENSE = /\b(nc|nd|non-?commercial|no ?deriv|fair use|copyrighted)\b/i;
const BAD_FILE = /(logo|map|flag|coat of arms|emblem|seal of|signature|chart|graph|diagram|locator|banner|icon|symbol|document|screenshot|poster|cover|ballot paper|\.svg|\.pdf|\.tif)/i;

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

function evaluate(page: any, subject: string, person: boolean): LicensedPhoto | null {
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata || {};
  const title: string = page.title || '';
  const license = strip(meta.LicenseShortName?.value);
  const restrictions = strip(meta.Restrictions?.value);

  if (!/^image\/(jpeg|png|webp)$/.test(info.mime || '')) return null;
  if (BAD_FILE.test(title)) return null;
  if (!license || !ALLOWED_LICENSE.test(license) || BLOCKED_LICENSE.test(license)) return null;
  if (restrictions && /personality|trademark|insignia/i.test(restrictions) && !person) return null;
  if ((info.width || 0) < 800 || (info.height || 0) < 450) return null;
  const ratio = info.width / info.height;
  if (ratio < 0.65 || ratio > 2.4) return null;

  const haystack = normalise(`${title} ${strip(meta.ImageDescription?.value)} ${strip(meta.ObjectName?.value)}`);
  const subjectWords = normalise(subject).split(' ').filter((w) => w.length > 2);
  if (person) {
    const surname = subjectWords[subjectWords.length - 1];
    if (!surname || !haystack.includes(surname)) return null;
  } else if (subjectWords.length && subjectWords.filter((w) => haystack.includes(w)).length < Math.ceil(subjectWords.length / 2)) {
    return null;
  }

  const artist = strip(meta.Artist?.value).slice(0, 80) || 'Unknown author';
  const url: string = info.thumburl || info.url;
  if (!/^https:\/\/upload\.wikimedia\.org\//.test(url)) return null;

  return {
    url,
    width: info.thumbwidth || info.width,
    height: info.thumbheight || info.height,
    license,
    credit: `Photo: ${artist} / ${license} via Wikimedia Commons`,
    pageUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
    subject,
  };
}

/** Try each subject in order (most specific first). Gives up quietly after `budgetMs`. */
export async function findLicensedPhoto(subjects: string[], budgetMs = 4500): Promise<LicensedPhoto | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);
  try {
    const unique = Array.from(new Set(subjects.map((s) => s.trim()).filter((s) => s.length > 2))).slice(0, 4);
    for (const subject of unique) {
      const person = looksLikePerson(subject);
      const pages = await search(person ? `"${subject}"` : subject, controller.signal);
      // Prefer landscape photos; they crop better in cards and social previews.
      const candidates = pages
        .map((p) => evaluate(p, subject, person))
        .filter((p): p is LicensedPhoto => !!p)
        .sort((a, b) => Number(b.width / b.height >= 1.2) - Number(a.width / a.height >= 1.2));
      if (candidates[0]) return candidates[0];
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
