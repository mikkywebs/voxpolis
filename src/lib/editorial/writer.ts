import { callNewsroomLLM, parseJsonReply } from './llm';
import { findConsecutiveWordOverlaps } from '@/lib/pipeline/overlap';
import { ALL_COUNTRIES } from '@/config/countries';

/**
 * The Voxpolis writer (v3).
 * Combines 1-4 reports of the same development into ONE original story whose
 * shape follows the news: the AI picks the story type and writes natural,
 * story-specific subheadings. Only the essentials are fixed (summary, attribution,
 * clearly signposted analysis, fairness, sources).
 */

export type SectionKind = 'report' | 'response' | 'context' | 'analysis' | 'reaction' | 'numbers';

export interface StorySection {
  heading: string;
  kind: SectionKind;
  paragraphs: string[];
}

export interface SourceInput {
  name: string;
  url: string;
  title: string;
  text: string;
  publishedAt?: string;
}

export interface EditorialPiece {
  is_political: boolean;
  country_iso: string;
  importance: number;
  story_type: string;
  headline: string;
  seo_title: string;
  meta_description: string;
  dek: string;
  key_points: string[];
  lead: string[];
  sections: StorySection[];
  what_to_watch: string | null;
  question: string | null;
  tags: string[];
  actors: string[];
  image_subjects: string[];
  slug_keywords: string;
  completeness: 'complete' | 'incomplete';
  incomplete_reason?: string | null;
  provider?: string;
  // Derived (for older pages, search and checks)
  body: string[];
  analysis: string[];
}

const STORY_TYPES = ['clash', 'policy', 'court', 'appointment', 'allegation', 'results', 'breaking', 'diplomacy', 'development'];
const KINDS: SectionKind[] = ['report', 'response', 'context', 'analysis', 'reaction', 'numbers'];

const SYSTEM = `You are the senior political editor at Voxpolis, a political news site known for explaining politics clearly and fairly.
You receive one or more reports (from different outlets) about the SAME development. Write ONE original Voxpolis story.

THE SHAPE FOLLOWS THE NEWS. First decide story_type, then use the natural flow for it. Do not force sections the story doesn't need.
- clash (a row between politicians or parties): what was said → what triggered it / the other side's position → context → analysis
- policy (bill, budget, regulation, government plan): what it does → who it affects and how → supporters' and critics' arguments → next steps
- court (ruling or case on a public matter): the decision → the reasoning → reactions → what changes now
- appointment (appointment, resignation, sacking, defection): who and why → their record → what it signals
- allegation (corruption claim, scandal, probe): the claim and who made it → the response or denial → what is established and what isn't
- results (election results, polls, turnout): the numbers → who gained and lost → what's driving it
- breaking (fast-moving event): what we know → what we don't know yet. Keep it short; analysis optional.
- diplomacy (international relations, summits, sanctions): what was agreed or said → each side's interest → wider stakes
- development (anything else): what happened → why → what it means

WRITING
- lead: 1-2 opening paragraphs, no heading. Who, what, when, where, and the news line. Make it engaging and human, not robotic.
- sections: 0-4 sections. Each heading is specific to THIS story, plain words, max 8 words, like "What sparked the row" or "Who loses under the new tax". NEVER generic labels such as "The News", "Background", "Analysis", "Conclusion", "Overview", "Why it matters".
- Short stories may have no sections at all.
- Exactly one section has kind "analysis" (except very short breaking stories, where it is optional). It explains what the reported facts mean: what is at stake, who is affected, how it fits the country's politics, what to watch. It is built ONLY on facts in the reports plus stable, certain background. It must not invent arguments, motives or predictions, and must not put views in the mouths of unnamed groups.
- Section kinds: report (what happened), response (the other side / reply), context (background a newcomer needs), analysis, reaction (what others said), numbers (figures).
- what_to_watch: one sentence on the next concrete step, only if the reports support it; else null.
- Total length 300-650 words. Short sentences. Plain English for a global audience. No hype, no clichés, no emojis, no markdown.

HARD RULES
1. ORIGINAL WORDS. Never copy 7 or more consecutive words from any report, except short quotes in quotation marks with attribution (max 2 quotes, each under 20 words).
2. FACTS ONLY FROM THE REPORTS. Keep names, titles, numbers, dates and places exact. Never invent quotes, reactions, figures, critics or outcomes. You may add stable, widely known context only if certain (e.g. the role of an institution).
   NO UNNAMED VOICES: never write "critics argue", "supporters say", "observers note", "analysts believe", "many Nigerians feel" or similar unless a report says it and names or quotes them. Write who said it.
3a. SAME MEANING, NEW WORDS. Rewording must not change the meaning. Do not strengthen or soften: "said" stays said (not admitted, claimed, slammed, conceded); "alleged" stays alleged; "about 320,000" keeps "about"; "plans to" is not "will". Do not add drama or adjectives the reports don't support (mounting pressure, soaring, intense, deep concern, fierce). Keep what is reported as fact separate from what someone claims.
3. COMBINE SOURCES. Report 1 is the main story. Use details from every other report about the SAME development; completely ignore any report that is about a different event. If reports disagree on a fact, say so and attribute each version ("Punch put the figure at X; Vanguard reported Y").
4. ATTRIBUTE every claim to who made it. Separate confirmed facts from allegations.
5. FAIRNESS. Never take a side, never use loaded words, never tell readers what to think or whom to vote for. When there is a dispute, include the other side's position IF a report gives it, attributed. If no report gives it, say so plainly in one short sentence (e.g. "The reports did not include a response from INEC.") — never make one up.
5a. OUTLETS CAN LEAN. Some outlets favour a party or government. Treat an outlet's characterisations as claims, not facts: attribute them ("according to Vanguard", "the party said"). Prefer facts that more than one report confirms. Do not repeat an outlet's loaded framing.
6. question: only when the story raises a genuine public choice readers can weigh (a policy, bill, proposal, decision). Neutral, agree/disagree, not leading. Otherwise null.
7. Not about politics/government/public policy/elections/courts on public matters/international relations → is_political=false.
8. Reports cut off or too thin → completeness="incomplete" with incomplete_reason.

ALSO RETURN
- headline 55-90 chars, specific, active; seo_title 45-60 chars leading with the most-searched name; meta_description 140-158 chars.
- dek: one sentence 18-32 words adding information beyond the headline.
- key_points: 2-4 one-sentence bullets for skimmers.
- importance 1-10 (9-10 national turning point; 6-8 significant national story; 4-5 notable; 1-3 minor).
- tags 3-6, actors (key people/institutions), image_subjects (2-3 Wikimedia Commons search terms: most important person's full name first, then the main institution/building with its country), slug_keywords (3-6 plain words, most-searched names first, no dates).`;

const STR = { type: 'STRING' };
const STR_LIST = { type: 'ARRAY', items: STR };
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_political: { type: 'BOOLEAN' },
    country_iso: STR,
    importance: { type: 'INTEGER' },
    story_type: { type: 'STRING', enum: STORY_TYPES },
    headline: STR,
    seo_title: STR,
    meta_description: STR,
    dek: STR,
    key_points: STR_LIST,
    lead: STR_LIST,
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { heading: STR, kind: { type: 'STRING', enum: KINDS }, paragraphs: STR_LIST },
        required: ['heading', 'kind', 'paragraphs'],
        propertyOrdering: ['heading', 'kind', 'paragraphs'],
      },
    },
    what_to_watch: { type: 'STRING', nullable: true },
    question: { type: 'STRING', nullable: true },
    tags: STR_LIST,
    actors: STR_LIST,
    image_subjects: STR_LIST,
    slug_keywords: STR,
    completeness: { type: 'STRING', enum: ['complete', 'incomplete'] },
    incomplete_reason: { type: 'STRING', nullable: true },
  },
  required: ['is_political', 'country_iso', 'importance', 'story_type', 'headline', 'seo_title', 'meta_description', 'dek', 'key_points', 'lead', 'sections', 'tags', 'actors', 'image_subjects', 'slug_keywords', 'completeness'],
  propertyOrdering: ['is_political', 'country_iso', 'importance', 'story_type', 'headline', 'seo_title', 'meta_description', 'dek', 'key_points', 'lead', 'sections', 'what_to_watch', 'question', 'tags', 'actors', 'image_subjects', 'slug_keywords', 'completeness', 'incomplete_reason'],
};

const GENERIC_HEADINGS = /^(the news|news|background|analysis|conclusion|overview|summary|why it matters|context|details|reaction|reactions|what next|what's next|next steps)$/i;

function words(s: string) {
  return s.split(/\s+/).filter(Boolean).length;
}

export async function writeVoxpolisArticle(input: { sources: SourceInput[]; deskCountry: string }): Promise<EditorialPiece> {
  const countryHint =
    input.deskCountry === 'WORLD'
      ? 'These came from an international desk. Set country_iso to the ISO-3166 alpha-2 code of the ONE country whose politics the story is mainly about.'
      : `These came from the ${input.deskCountry} desk. Use country_iso="${input.deskCountry}" unless the story is clearly about another country's politics.`;

  // Keep the prompt within budget: the lead source gets the most room.
  const budget = [7000, 4000, 3000, 2500];
  const reports = input.sources
    .slice(0, 4)
    .map(
      (s, i) => `--- REPORT ${i + 1}: ${s.name}${s.publishedAt ? ` (${s.publishedAt.slice(0, 10)})` : ''}
Headline: ${s.title}
${s.text.slice(0, budget[i])}`
    )
    .join('\n\n');

  const user = `${countryHint}
Today: ${new Date().toISOString().slice(0, 10)}
Number of reports: ${Math.min(input.sources.length, 4)}

${reports}`;

  let reply = await callNewsroomLLM(SYSTEM, user, RESPONSE_SCHEMA);
  let raw: any;
  try {
    raw = parseJsonReply<any>(reply.text);
  } catch (first) {
    reply = await callNewsroomLLM(SYSTEM, user, RESPONSE_SCHEMA);
    raw = parseJsonReply<any>(reply.text);
    reply.notes.unshift(`retried after unreadable reply (${(first as Error).message.slice(0, 60)})`);
  }
  const { provider, notes } = reply;

  const arr = (v: any) => (Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : []).map((x: any) => String(x).trim()).filter(Boolean);
  const str = (v: any) => (typeof v === 'string' ? v.trim() : '');

  const sections: StorySection[] = (Array.isArray(raw.sections) ? raw.sections : [])
    .map((s: any) => ({
      heading: str(s?.heading).replace(/[.:]$/, ''),
      kind: (KINDS.includes(s?.kind) ? s.kind : 'report') as SectionKind,
      paragraphs: arr(s?.paragraphs),
    }))
    .filter((s: StorySection) => s.paragraphs.length > 0)
    .slice(0, 5);

  const lead = arr(raw.lead);
  const body = [...lead, ...sections.filter((s) => s.kind !== 'analysis').flatMap((s) => s.paragraphs)];
  const analysis = sections.filter((s) => s.kind === 'analysis').flatMap((s) => s.paragraphs);

  return {
    is_political: raw.is_political !== false,
    country_iso: str(raw.country_iso).toUpperCase().slice(0, 2),
    importance: Math.max(1, Math.min(10, Number(raw.importance) || 5)),
    story_type: STORY_TYPES.includes(raw.story_type) ? raw.story_type : 'development',
    headline: str(raw.headline),
    seo_title: str(raw.seo_title),
    meta_description: str(raw.meta_description),
    dek: str(raw.dek),
    key_points: arr(raw.key_points).slice(0, 4),
    lead,
    sections,
    what_to_watch: str(raw.what_to_watch) || null,
    question: str(raw.question) || null,
    tags: arr(raw.tags).slice(0, 6),
    actors: arr(raw.actors).slice(0, 10),
    image_subjects: arr(raw.image_subjects).slice(0, 3),
    slug_keywords: str(raw.slug_keywords),
    completeness: raw.completeness === 'incomplete' ? 'incomplete' : 'complete',
    incomplete_reason: raw.incomplete_reason || null,
    provider: notes.length ? `${provider} (after: ${notes.join(' | ')})` : provider,
    body,
    analysis,
  };
}

/** Quality gates. Returns a list of problems; empty list = good enough to become a draft. */
export function checkPiece(piece: EditorialPiece, sources: SourceInput[], minImportance: number): string[] {
  const problems: string[] = [];
  if (!piece.is_political) problems.push('not political');
  if (piece.completeness === 'incomplete') problems.push(`incomplete: ${piece.incomplete_reason || 'source too thin'}`);
  if (!ALL_COUNTRIES.some((c) => c.code === piece.country_iso)) problems.push(`unknown country "${piece.country_iso}"`);
  if (piece.importance < minImportance) problems.push(`importance ${piece.importance} below ${minImportance}`);
  if (piece.headline.length < 30) problems.push('headline too short');
  if (piece.lead.length === 0) problems.push('no opening paragraph');

  const total = words([...piece.body, ...piece.analysis].join(' '));
  const minWords = piece.story_type === 'breaking' ? 160 : 240;
  if (total < minWords) problems.push(`story only ${total} words`);
  if (piece.story_type !== 'breaking' && words(piece.analysis.join(' ')) < 60) problems.push('analysis missing or too thin');

  const generic = piece.sections.filter((s) => GENERIC_HEADINGS.test(s.heading.trim()));
  if (generic.length) problems.push(`generic subheading "${generic[0].heading}"`);

  const everything = [piece.headline, piece.dek, ...piece.key_points, ...piece.body, ...piece.analysis, piece.what_to_watch || ''].join('\n');
  if (/\[\.\.\.\]|read more|click here|continue reading/i.test(everything)) problems.push('teaser text present');

  // Originality: no 10+ identical words in a row from any source, outside quotation marks.
  const unquoted = everything.replace(/["“][^"”]{0,200}["”]/g, ' ');
  const allSources = sources.map((s) => `${s.title}\n${s.text}`).join('\n');
  const overlaps = findConsecutiveWordOverlaps(allSources, unquoted, 10);
  if (overlaps.length > 0) problems.push(`copied wording: "${overlaps[0].span}"`);

  return problems;
}

/** All copied spans (10+ identical words) between the story and its sources. */
export function copiedSpans(piece: EditorialPiece, sources: SourceInput[]): string[] {
  const everything = [piece.headline, piece.dek, ...piece.key_points, ...piece.body, ...piece.analysis, piece.what_to_watch || ''].join('\n');
  const unquoted = everything.replace(/["“][^"”]{0,200}["”]/g, ' ');
  const allSources = sources.map((s) => `${s.title}\n${s.text}`).join('\n');
  return findConsecutiveWordOverlaps(allSources, unquoted, 10).map((o) => o.span).slice(0, 6);
}

const REPAIR_SYSTEM = `You are a sub-editor. You receive a news story as JSON and a list of phrases that repeat the original reports word for word.
Rewrite ONLY the sentences containing those phrases so no run of 7+ words matches the original wording. Keep every fact, name, number and date exactly. Lists of names may be restructured (e.g. "the governors of Borno, Adamawa and Sokoto"). Do not change anything else. Return the full story JSON in the same shape.`;

/** One repair pass: rewrite only sentences flagged as copied, then return the updated story. */
export async function repairCopiedWording(piece: EditorialPiece, sources: SourceInput[]): Promise<EditorialPiece> {
  const spans = copiedSpans(piece, sources);
  if (!spans.length) return piece;
  const story = {
    headline: piece.headline,
    dek: piece.dek,
    key_points: piece.key_points,
    lead: piece.lead,
    sections: piece.sections,
    what_to_watch: piece.what_to_watch,
  };
  const schema = {
    type: 'OBJECT',
    properties: {
      headline: STR,
      dek: STR,
      key_points: STR_LIST,
      lead: STR_LIST,
      sections: RESPONSE_SCHEMA.properties.sections,
      what_to_watch: { type: 'STRING', nullable: true },
    },
    required: ['headline', 'dek', 'key_points', 'lead', 'sections'],
  };
  const reply = await callNewsroomLLM(REPAIR_SYSTEM, `Phrases to rewrite:\n- ${spans.join('\n- ')}\n\nStory JSON:\n${JSON.stringify(story)}`, schema);
  const raw = parseJsonReply<any>(reply.text);
  const arr = (v: any) => (Array.isArray(v) ? v : []).map((x: any) => String(x).trim()).filter(Boolean);
  const sections: StorySection[] = (Array.isArray(raw.sections) ? raw.sections : piece.sections)
    .map((x: any) => ({ heading: String(x?.heading || '').trim(), kind: (KINDS.includes(x?.kind) ? x.kind : 'report') as SectionKind, paragraphs: arr(x?.paragraphs) }))
    .filter((x: StorySection) => x.paragraphs.length);
  const lead = arr(raw.lead).length ? arr(raw.lead) : piece.lead;
  return {
    ...piece,
    headline: String(raw.headline || piece.headline).trim(),
    dek: String(raw.dek || piece.dek).trim(),
    key_points: arr(raw.key_points).length ? arr(raw.key_points) : piece.key_points,
    lead,
    sections: sections.length ? sections : piece.sections,
    what_to_watch: typeof raw.what_to_watch === 'string' ? raw.what_to_watch.trim() || null : piece.what_to_watch,
    body: [...lead, ...(sections.length ? sections : piece.sections).filter((x) => x.kind !== 'analysis').flatMap((x) => x.paragraphs)],
    analysis: (sections.length ? sections : piece.sections).filter((x) => x.kind === 'analysis').flatMap((x) => x.paragraphs),
  };
}
