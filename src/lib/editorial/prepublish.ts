import { namesIn, numbersIn, SourceFacts } from './facts';

/**
 * Pre-publish check for the editor. Runs on the server (when drafts load and again on Publish)
 * and in the browser (live, as the editor types).
 *
 * Every item belongs to one part of the story (headline, a section, the photo, Google listing...),
 * so each part gets its own colour:
 *   red    = must fix before publishing
 *   amber  = look at it; if it is right, press "It's correct" and it turns green
 *   green  = nothing found
 * It cannot guarantee a story is safe. It catches the mistakes that cause real trouble.
 */

export type Level = 'ready' | 'check' | 'stop';
export type ItemLevel = 'stop' | 'check' | 'tip';

export interface CheckItem {
  level: ItemLevel;
  field: string; // headline | dek | glance | lead | sec:N | content | analysis | background | watch | photo | seo | sources | story
  text: string;
  how?: string; // how to find out if it is right
  key?: string; // present when the editor can mark it as correct
}

export interface CheckResult {
  level: Level;
  items: CheckItem[];
  confirmed: CheckItem[]; // amber items the editor marked as correct
}

export interface CheckInput {
  title: string;
  slug?: string | null;
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
  checked_items?: string[] | null;
  new_reports_at?: string | null;
  category?: string | null;
  origin?: string | null;
  fidelity?: {
    checked_at: string;
    status: 'done' | 'no_sources' | 'failed';
    note?: string;
    issues: { sentence: string; problem: string; explanation: string; source_says?: string | null }[];
  } | null;
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

// Opinions or arguments given to unnamed groups: the most common way a rewrite drifts from the reports.
const UNNAMED =
  /\b(?:critics|supporters|observers|analysts|experts|commentators|opponents|detractors|proponents|skeptics|sceptics|many(?: \w+)?|some(?: \w+)?)(?:\s+of\s+(?:the\s+)?\w+(?:\s+\w+)?)?\s+(?:often\s+|have\s+|would\s+|also\s+)?(?:argue|argued|say|said|note|noted|believe|believed|contend|maintain|warn|warned|point out|suggest|fear|feel|insist|claim)\b|\bit is (?:widely )?(?:believed|argued|felt|said)\b/gi;

const HOW = {
  unnamed:
    'Open the original reports and search for this point. If a report says it, write who said it (a name, a party, an organisation). If no report says it, delete the sentence: it was added by the writer, not the source.',
  number: (n: string) =>
    `Open the original report (links under "Sources"), press Ctrl+F (on a phone: "Find in page") and type ${n}. It may be written differently, e.g. "2.5 million" instead of 2500000, or as a date. If it is there and means the same thing, press "It's correct". If not, fix or remove it.`,
  name: (n: string) =>
    `Search the original report for "${n.split(' ').slice(-1)[0]}". Check the spelling and the person's job title. If the name is right and belongs in the story, press "It's correct".`,
  loaded: 'Replace the word with the suggestion. Only keep it if it is a direct quote (put it in quote marks and say who said it), then press "It\'s correct".',
  opinion: 'Remove the word, or move the sentence into the Analysis section. If it is a plain fact (for example "the best result since 1999" from official figures), press "It\'s correct".',
};

function stripQuotes(s: string) {
  return s.replace(/["“][^"”]{0,300}["”]/g, ' ');
}

const WIKIMEDIA = /^https:\/\/(upload|thumb)\.wikimedia\.org\//;
const OWN_STORAGE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/article-images\//;
const LICENCE = /\b(CC|Creative Commons|public domain|PD|CC0|OGL|GODL|Open Government)\b/i;

export function checkStory(a: CheckInput): CheckResult {
  const items: CheckItem[] = [];
  const sections = (a.sections || []).filter((s) => s.paragraphs?.length);
  const flexible = sections.length > 0 || !!a.lead;

  // The text of each part, so problems are reported where they are.
  const parts: { field: string; text: string; news: boolean; sentences: boolean }[] = [
    { field: 'headline', text: a.title || '', news: true, sentences: false },
    { field: 'dek', text: a.dek || '', news: true, sentences: true },
    { field: 'glance', text: (a.key_points || []).join('\n'), news: true, sentences: true },
  ];
  if (flexible) {
    parts.push({ field: 'lead', text: a.lead || '', news: true, sentences: true });
    sections.forEach((s, i) => parts.push({ field: `sec:${i}`, text: [s.heading, ...s.paragraphs].join('\n'), news: s.kind !== 'analysis', sentences: true }));
  } else {
    parts.push({ field: 'content', text: a.content || '', news: true, sentences: true });
    parts.push({ field: 'analysis', text: a.analysis || '', news: false, sentences: true });
    parts.push({ field: 'background', text: a.background || '', news: true, sentences: true });
  }
  parts.push({ field: 'watch', text: a.what_to_watch || a.what_next || '', news: true, sentences: true });

  const bodyParts = parts.filter((p) => p.field === 'lead' || p.field.startsWith('sec:') || p.field === 'content' || p.field === 'analysis');
  const words = bodyParts.map((p) => p.text).join(' ').split(/\s+/).filter(Boolean).length;
  const hasAnalysis = flexible ? sections.some((s) => s.kind === 'analysis') : !!(a.analysis || '').trim();
  const firstField = flexible ? 'lead' : 'content';

  // --- Whole story ---
  if (words < 200) items.push({ level: 'stop', field: firstField, text: `The story is only ${words} words. Add facts from the original report, or discard it.` });
  const ageH = (Date.now() - new Date(a.created_at).getTime()) / 3600_000;
  if (ageH > 72) items.push({ level: 'stop', field: 'story', text: `This draft is ${Math.round(ageH / 24)} days old. Check the story hasn't moved on before publishing.` });
  if (!(a.sources?.length || a.source_url?.startsWith('http')))
    items.push({ level: 'stop', field: 'sources', text: 'No original report is linked. Every story must credit its source.' });
  else if ((a.sources?.length || 1) === 1) items.push({ level: 'tip', field: 'sources', text: 'Only one outlet is used. Take extra care with names and numbers.' });

  // --- Headline ---
  if (!a.title || a.title.length < 30) items.push({ level: 'stop', field: 'headline', text: 'The headline is too short. Make it say who did what.' });
  if (a.title && a.title.length > 110) items.push({ level: 'stop', field: 'headline', text: 'The headline is over 110 characters. Google will reject it as a news headline. Shorten it.' });

  // --- Words, numbers and names, part by part ---
  const srcNums = a.source_facts ? new Set(a.source_facts.numbers) : null;
  const srcNames = a.source_facts ? a.source_facts.names.join(' ').toLowerCase() : '';
  const seenNum = new Set<string>();
  const seenName = new Set<string>();
  parts.forEach((p) => {
    if (!p.text.trim()) return;
    const plain = stripQuotes(p.text);
    LOADED.forEach(([re, alt]) => {
      const m = plain.match(re);
      if (m) items.push({ level: 'check', field: p.field, text: `Loaded word "${m[0]}". Use instead: ${alt}.`, how: HOW.loaded, key: `loaded:${p.field}:${m[0].toLowerCase()}` });
    });
    const vague = Array.from(new Set((plain.match(UNNAMED) || []).map((w) => w.toLowerCase())));
    vague.slice(0, 2).forEach((v) =>
      items.push({ level: 'check', field: p.field, text: `"${v}": who exactly? Opinions must be credited to a named person or group from the reports.`, how: HOW.unnamed, key: `unnamed:${p.field}:${v}` })
    );
    if (p.news && a.category !== 'opinion') {
      const op = Array.from(new Set((plain.match(OPINION) || []).map((w) => w.toLowerCase())));
      if (op.length)
        items.push({ level: 'check', field: p.field, text: `Opinion word${op.length > 1 ? 's' : ''} in the news part: "${op.join('", "')}".`, how: HOW.opinion, key: `op:${p.field}:${op.join(',')}` });
    }
    if (srcNums) {
      numbersIn(plain)
        .filter((n) => (Number(n) > 10 || n.includes('.')) && !srcNums.has(n) && !seenNum.has(n))
        .slice(0, 4)
        .forEach((n) => {
          seenNum.add(n);
          items.push({ level: 'check', field: p.field, text: `The number ${n} is not in the original reports.`, how: HOW.number(n), key: `num:${n}` });
        });
    }
    if (a.source_facts && p.sentences) {
      namesIn(plain)
        .filter((n) => !n.split(/\s+/).some((w) => w.length > 3 && srcNames.includes(w.toLowerCase())) && !seenName.has(n.toLowerCase()))
        .slice(0, 3)
        .forEach((n) => {
          seenName.add(n.toLowerCase());
          items.push({ level: 'check', field: p.field, text: `The name "${n}" is not in the original reports.`, how: HOW.name(n), key: `name:${n.toLowerCase()}` });
        });
    }
  });

  if (a.new_reports_at)
    items.push({
      level: 'check',
      field: 'sources',
      text: 'More outlets reported this story after the draft was made. They were added under Sources.',
      how: 'Open the newer reports and see if anything changed: new figures, a response from the other side, a correction. Update the story if needed, then press "It\'s correct".',
      key: `newreports:${a.new_reports_at}`,
    });

  if (!a.source_facts)
    items.push({
      level: 'check',
      field: 'sources',
      text: 'This draft was made before automatic fact-checking, so names and numbers were not compared with the original reports.',
      how: 'Open the original report and compare every name, job title, number and date by hand. When they all match, press "It\'s correct".',
      key: 'facts:manual',
    });

  // --- AI accuracy check: sentences the original reports don't support ---
  const PROBLEM_LABEL: Record<string, string> = {
    not_in_sources: 'Not in the original reports',
    meaning_changed: 'Meaning changed from the reports',
    wrong_detail: 'A detail differs from the reports',
    unattributed_opinion: 'Opinion given to unnamed people',
    invented_reaction: 'A reaction no report contains',
    loaded_framing: 'One-sided wording',
  };
  const norm = (t: string) => t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
  if (a.fidelity?.status === 'done') {
    a.fidelity.issues.forEach((f) => {
      const want = norm(f.sentence);
      // Only issues whose sentence is still in the story: once the editor rewrites it, the item disappears.
      const where = parts.find((p) => norm(p.text).includes(want)) || (want.length > 40 ? parts.find((p) => norm(p.text).includes(want.slice(0, 40))) : undefined);
      if (!where) return;
      items.push({
        level: 'check',
        field: where.field,
        text: `${PROBLEM_LABEL[f.problem] || 'Check this sentence'}: "${f.sentence.length > 160 ? f.sentence.slice(0, 157) + '…' : f.sentence}"`,
        how: `${f.explanation}${f.source_says ? ` The report says: "${f.source_says}"` : ''} Fix or delete the sentence. If you have checked it and it is right, press "It's correct".`,
        key: `fid:${want.slice(0, 120)}`,
      });
    });
  } else if (a.fidelity?.status === 'failed') {
    items.push({ level: 'tip', field: 'story', text: 'The automatic accuracy check could not run. Press "Check accuracy" to try again.' });
  } else if (!a.fidelity && a.origin !== 'editor' && (a.sources?.length || 0) > 0) {
    items.push({ level: 'tip', field: 'story', text: 'The automatic accuracy check has not run yet (it runs every 10 minutes). You can press "Check accuracy" now.' });
  }

  if (!hasAnalysis && a.category !== 'opinion')
    items.push({
      level: 'check',
      field: flexible ? 'lead' : 'analysis',
      text: 'There is no Analysis section.',
      how: 'Readers come to Voxpolis for what the news means, so most stories should have one. For a short breaking update it can wait: press "It\'s correct".',
      key: 'analysis:none',
    });
  if (!(a.key_points || []).length) items.push({ level: 'check', field: 'glance', text: 'No "At a glance" points. Add 2-4 short bullets.' });
  else if ((a.key_points || []).length > 4) items.push({ level: 'tip', field: 'glance', text: 'More than 4 points. Keep the best 3 or 4.' });

  // --- Photo ---
  const img = (a.original_image_url || '').trim();
  const credit = (a.image_credit || '').trim();
  if (!img) {
    items.push({
      level: 'check',
      field: 'photo',
      text: 'No photo. The Voxpolis card will be shown instead.',
      how: 'Stories with a real photo do better on Google, especially Google Discover. Upload a photo you own or have permission to use. If the card is fine for this story, press "It\'s correct".',
      key: 'photo:none',
    });
  } else if (WIKIMEDIA.test(img)) {
    if (!credit || !LICENCE.test(credit))
      items.push({ level: 'stop', field: 'photo', text: 'This Wikimedia photo has no author and licence in the credit.', how: 'Wikimedia photos may only be used with the author and licence shown, e.g. "Photo: Jane Doe / CC BY-SA 4.0 via Wikimedia Commons". Add it, or remove the photo.' });
    items.push({
      level: 'check',
      field: 'photo',
      text: 'Make sure this photo shows the right person or place.',
      how: 'Look at the photo and its credit. A wrong face next to a political story is a serious error. If it is right, press "It\'s correct". If not, replace or remove it.',
      key: `photo:${img}`,
    });
  } else if (OWN_STORAGE.test(img)) {
    items.push({
      level: 'check',
      field: 'photo',
      text: 'You uploaded this photo. Confirm you have the right to use it.',
      how: 'Allowed: a photo you took, an official government or party handout that allows reuse, or licensed stock. Not allowed: photos copied from news sites or social media. If you have the right, press "It\'s correct".',
      key: `photo:${img}`,
    });
  } else {
    items.push({ level: 'stop', field: 'photo', text: 'This photo comes from a website we cannot verify.', how: 'Upload the photo here, or use one from Wikimedia Commons.' });
  }

  // --- Google listing (SEO) ---
  const desc = (a.meta_description || a.dek || '').trim();
  if (!desc) items.push({ level: 'check', field: 'seo', text: 'No Google description. Write one or two sentences saying what happened.' });
  else if (desc.length < 70) items.push({ level: 'check', field: 'seo', text: `The Google description is short (${desc.length} characters). Aim for 120-160.` });
  else if (desc.length > 160) items.push({ level: 'check', field: 'seo', text: `The Google description is ${desc.length} characters. Google cuts it after about 160.` });
  if (a.title && a.title.length > 70) items.push({ level: 'tip', field: 'seo', text: 'Google shows about the first 60-70 characters of the headline in search. Make sure the key words come first.' });
  if (a.slug && (/\d{4}-\d{2}-\d{2}/.test(a.slug) || /-[a-z0-9]{4}$/.test(a.slug) && /\d/.test(a.slug.slice(-4))))
    items.push({ level: 'tip', field: 'seo', text: 'The web address has a date or random code in it. Shorter, clearer words rank better (while it is still a draft you can change it).' });

  // --- Good practice ---
  const edited = a.updated_at && new Date(a.updated_at).getTime() - new Date(a.created_at).getTime() > 60_000;
  if (!edited) items.push({ level: 'tip', field: 'story', text: 'Add your own touch: sharpen the headline or add one sentence of context you know.' });

  // Amber items the editor already confirmed turn green.
  const ok = new Set(a.checked_items || []);
  const confirmed = items.filter((i) => i.level === 'check' && i.key && ok.has(i.key));
  const open = items.filter((i) => !(i.level === 'check' && i.key && ok.has(i.key)));

  const level: Level = open.some((i) => i.level === 'stop') ? 'stop' : open.some((i) => i.level === 'check') ? 'check' : 'ready';
  return { level, items: open, confirmed };
}

/** Colour of one part of the story: red, amber or green. Tips don't change the colour. */
export function fieldLevel(r: CheckResult, field: string): 'red' | 'amber' | 'green' {
  const mine = r.items.filter((i) => i.field === field);
  if (mine.some((i) => i.level === 'stop')) return 'red';
  if (mine.some((i) => i.level === 'check')) return 'amber';
  return 'green';
}
