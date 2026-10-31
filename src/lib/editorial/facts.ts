/**
 * Facts found in text: numbers and proper names.
 * Stored with each draft from the original reports, then compared with the story
 * so the editor sees any number or name that does not appear in the sources.
 */

export interface SourceFacts {
  numbers: string[];
  names: string[];
}

const STOP_NAMES = new Set([
  'The', 'A', 'An', 'In', 'On', 'At', 'He', 'She', 'They', 'It', 'We', 'But', 'And', 'Mr', 'Mrs', 'Ms', 'Dr',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
]);

/** Numbers normalised so "1,200" = "1200" and "4.85" stays "4.85". Years and plain small numbers are kept too. */
export function numbersIn(text: string): string[] {
  const out = new Set<string>();
  (text.match(/\b\d[\d,]*(?:\.\d+)?\b/g) || []).forEach((n) => {
    const clean = n.replace(/,/g, '').replace(/\.0+$/, '');
    if (clean.length > 0) out.add(clean);
  });
  return Array.from(out);
}

/** Capitalised multi-word names (people, parties, places, institutions). */
export function namesIn(text: string): string[] {
  const out = new Set<string>();
  const re = /\b([A-Z][a-zA-Z'’\-]+(?:\s+(?:of|the|and|de|al|bin|van|von)?\s*[A-Z][a-zA-Z'’\-]+){1,4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const words = m[1].split(/\s+/).filter((w) => !STOP_NAMES.has(w));
    if (words.length >= 2) out.add(words.join(' '));
  }
  return Array.from(out);
}

export function extractFacts(sourceText: string): SourceFacts {
  return { numbers: numbersIn(sourceText).slice(0, 400), names: namesIn(sourceText).slice(0, 400) };
}
