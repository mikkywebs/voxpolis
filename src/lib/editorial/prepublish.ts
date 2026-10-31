import { namesIn, numbersIn, SourceFacts } from './facts';

/**
 * Pre-publish check for the editor: a traffic light plus the exact things to look at.
 * It cannot guarantee anything; it catches the mistakes that cause real trouble:
 * invented numbers or names, loaded words, opinion in the news part, thin or stale stories.
 */

export type Level = 'ready' | 'check' | 'stop';

export interface CheckItem {
  level: 'stop' | 'check' | 'tip';
  text: string;
}

export interface CheckResult {
  level: Level;
  items: CheckItem[];
}

export interface CheckInput {
  title: string;
  dek?: string | null;
  key_points?: string[] | null;
  lead?: string | null;
  sections?: { heading: string; kind: string; paragraphs: string[] }[] | null;
  content?: string | null;
  analysis?: string | null;
  background?: string | null;
  what_next?: string | null;
  what_to_watch?: string | null;
  sources?: { name: string; url: string }[] | null;
  source_url?: string | null;
  source_facts?: SourceFacts | null;
  original_image_url?: string | null;
  image_credit?: string | null;
  meta_description?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// Loaded or emotive labels → a neutral alternative.
const LOADED: [RegExp, string][] = [
  [/\bfar[- ]right\b/i, 'right-wing, or name the party/coalition'],
  [/\bfar[- ]left\b/i, 'left-wing, or name the party'],
  [/\bextremists?\b/i, 'describe what they did, or attribute the label ("X called them extremists")'],
  [/\bradicals?\b/i, 'describe the position instead'],
  [/\bregime\b/i, 'government or administration'],
  [/\bthugs?\b/i, 'attackers, or attribute the word to who said it'],
  [/\bterrorists?\b/i, 'attribute it ("the government says…") unless officially designated'],
  [/\b(slammed|blasted|lashed out|ranted|fumed)\b/i, 'criticised, said, rejected'],
  [/\b(disgraceful|shameful|outrageous|scandalous|shocking|appalling)\b/i, 'remove, or quote who said it'],
  [/\bso-called\b/i, 'remove'],
  [/\b(cabal|cronies|stooges?|puppets?|mouthpiece)\b/i, 'allies, associates, or quote who said it'],
  [/\b(propaganda|lies|liar)\b/i, 'false claim (if established) or "disputed" with attribution'],
  [/\b(incompetent|clueless|corrupt)\b/i, 'attribute it, or describe the evidence'],
  [/\b(hero|heroic|villain|desperate|embattled)\b/i, 'neutral description'],
];

// Opinion or certainty words that don't belong in the news part (fine inside the labelled analysis).
const OPINION = /\b(overwhelming(?:ly)?|clearly|obviously|undoubtedly|undeniably|of course|everyone knows|beloved|brilliant|disastrous|best|worst|finally|sadly|unfortunately|thankfully|hugely popular|very popular)\b/gi;

function stripQuotes(s: string) {
  return s.replace(/["“][^"”]{0,300}["”]/g, ' ');
}

export function checkStory(a: CheckInput): CheckResult {
  const items: CheckItem[] = [];
  const sections = (a.sections || []).filter((s) => s.paragraphs?.length);
  const flexible = sections.length > 0 || !!a.lead;

  const newsText = flexible
    ? [a.lead || '', ...sections.filter((s) => s.kind !== 'analysis').flatMap((s) => s.paragraphs)].join('\n')
    : [a.content || '', a.background || ''].join('\n');
  const analysisText = flexible ? sections.filter((s) => s.kind === 'analysis').flatMap((s) => s.paragraphs).join('\n') : a.analysis || '';
  const allText = [a.title, a.dek || '', ...(a.key_points || []), newsText, analysisText, a.what_to_watch || a.what_next || ''].join('\n');
  const words = [newsText, analysisText].join(' ').split(/\s+/).filter(Boolean).length;

  // --- Stop: don't publish until fixed ---
  if (words < 200) items.push({ level: 'stop', text: `The story is only ${words} words. Add facts from the original report, or discard it.` });
  if (!a.title || a.title.length < 30) items.push({ level: 'stop', text: 'The headline is too short. Make it say who did what.' });
  if (a.title && a.title.length > 110) items.push({ level: 'stop', text: 'The headline is too long for Google (over 110 characters). Shorten it.' });
  if (!(a.sources?.length || a.source_url?.startsWith('http'))) items.push({ level: 'stop', text: 'No original report is linked. Every story must credit its source.' });
  const ageH = (Date.now() - new Date(a.created_at).getTime()) / 3600_000;
  if (ageH > 72) items.push({ level: 'stop', text: `This draft is ${Math.round(ageH / 24)} days old. Check the story hasn't moved on before publishing.` });

  // --- Check: look at these before publishing ---
  LOADED.forEach(([re, alt]) => {
    const m = stripQuotes(allText).match(re);
    if (m) items.push({ level: 'check', text: `Loaded word "${m[0]}". Use instead: ${alt}.` });
  });

  const opinion = Array.from(new Set((stripQuotes(newsText).match(OPINION) || []).map((w) => w.toLowerCase())));
  if (opinion.length) items.push({ level: 'check', text: `Opinion words in the news part: "${opinion.join('", "')}". Keep opinions to the Analysis section, or remove them.` });

  if (a.source_facts) {
    const srcNums = new Set(a.source_facts.numbers);
    const storyNums = numbersIn(stripQuotes(allText)).filter((n) => Number(n) > 10 || n.includes('.'));
    const missing = storyNums.filter((n) => !srcNums.has(n));
    if (missing.length)
      items.push({ level: 'check', text: `Numbers not found in the original reports: ${missing.slice(0, 6).join(', ')}. Confirm each one, or remove it.` });

    const srcNames = a.source_facts.names.join(' ').toLowerCase();
    // Headlines are in Title Case, so names are only checked in sentences.
    const sentenceText = [...(a.key_points || []), newsText, analysisText].join('\n');
    const strangers = namesIn(sentenceText).filter((n) => !n.split(/\s+/).some((w) => w.length > 3 && srcNames.includes(w.toLowerCase())));
    if (strangers.length)
      items.push({ level: 'check', text: `Names not found in the original reports: ${strangers.slice(0, 5).join(', ')}. Make sure they are correct and relevant.` });
  }

  if (!analysisText.trim()) items.push({ level: 'check', text: 'No analysis section. Readers come to Voxpolis for what it means: add a short one.' });
  if (!(a.key_points || []).length) items.push({ level: 'check', text: 'No "At a glance" points. Add 2-4 short bullets.' });

  // --- Tips: good practice ---
  if ((a.sources?.length || 1) === 1) items.push({ level: 'tip', text: 'Only one outlet is used. Take extra care with names and numbers.' });
  const edited = a.updated_at && new Date(a.updated_at).getTime() - new Date(a.created_at).getTime() > 60_000;
  if (!edited) items.push({ level: 'tip', text: 'Add your own touch: sharpen the headline or add one sentence of context you know.' });
  if (!a.original_image_url) items.push({ level: 'tip', text: 'No photo. The Voxpolis card will be used; upload one if you have the rights.' });
  if (!a.meta_description) items.push({ level: 'tip', text: 'No Google description. The summary line will be used instead.' });

  const level: Level = items.some((i) => i.level === 'stop') ? 'stop' : items.some((i) => i.level === 'check') ? 'check' : 'ready';
  return { level, items };
}
