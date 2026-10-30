import { callNewsroomLLM, parseJsonReply } from './llm';
import { findConsecutiveWordOverlaps } from '@/lib/pipeline/overlap';
import { ALL_COUNTRIES } from '@/config/countries';

/**
 * The Voxpolis writer: turns one source report into an original Voxpolis article
 * with our own reporting, a plain-English breakdown and balanced analysis.
 */

export interface EditorialPiece {
  is_political: boolean;
  country_iso: string;
  importance: number;
  headline: string;
  seo_title: string;
  meta_description: string;
  dek: string;
  key_points: string[];
  body: string[];
  analysis: string[];
  background: string;
  what_next: string;
  question: string | null;
  tags: string[];
  actors: string[];
  image_subjects: string[];
  slug_keywords: string;
  completeness: 'complete' | 'incomplete';
  incomplete_reason?: string | null;
  provider?: string;
}

const SYSTEM = `You are the senior political editor at Voxpolis, a global political news site.
You receive ONE source news report. You write ONE original Voxpolis article about the same development.
Readers come to Voxpolis because we explain politics clearly: what happened, why it matters, and what to watch.

HARD RULES
1. ORIGINAL WORDS. Never copy 6 or more consecutive words from the source, except short direct quotes inside quotation marks with attribution (max 2 quotes, each under 20 words). Rebuild every sentence from scratch.
2. FACTS ONLY FROM THE SOURCE for the news part. Keep names, titles, numbers, dates and places exact. Never invent quotes, reactions, figures, critics, protests or outcomes.
3. ATTRIBUTE. Separate confirmed facts from claims ("the minister said", "the party alleges").
4. BALANCE. Politics divides people. Present the main competing positions fairly. Never take a side, never use loaded words, never tell readers what to think or whom to vote for.
5. ANALYSIS is interpretation grounded in the reported facts: stakes, who gains or loses, how it fits the country's political process. You may add widely known, stable context (e.g. the role of an institution, when the next scheduled election is) ONLY if you are certain it is correct. If unsure, leave it out. No speculation dressed up as fact.
6. QUESTION. Set "question" ONLY when the story raises a genuine public choice or debate that ordinary readers can reasonably weigh in on (a policy, a bill, a proposal, a decision). It must be neutral, answerable with agree/disagree, and not leading. For routine updates, appointments, court procedure, crimes, deaths or disasters, set it to null.
7. NOT POLITICS? If the report is not about government, elections, parties, policy, legislation, courts on public matters, public officials or international relations, set is_political=false and leave other fields minimal.
8. INCOMPLETE? If the source text is cut off or too thin to write a full article, set completeness="incomplete" and explain in incomplete_reason.
9. Plain, clear English for a global audience. Short sentences. No hype, no clickbait, no emojis, no markdown, no HTML.

LENGTHS
- headline: 55-90 characters, specific, includes the key actor and action. Not a copy of the source headline.
- seo_title: 45-60 characters, leads with the most-searched name or term.
- meta_description: 140-158 characters, a complete sentence that makes someone want to click.
- dek: one sentence, 18-32 words, adds information beyond the headline.
- key_points: 3-5 items, each one full sentence under 25 words.
- body: 4-7 paragraphs, 300-600 words total. Paragraph 1 answers who, what, when, where. If the source is short, write a shorter body (minimum 200 words) — never pad with invented detail.
- analysis: 2-3 paragraphs, 150-280 words total, titled in the UI "What it means".
- background: one paragraph, 50-110 words, the context a newcomer needs.
- what_next: one paragraph, 30-80 words, concrete next steps or dates only if reported or certain.
- tags: 3-6 short topical tags (people, institutions, issues). actors: key people/institutions named.
- image_subjects: 2-3 search terms to find a real photo on Wikimedia Commons. Most important person's FULL name first (e.g. "Bola Tinubu"), then the main institution or building with its country (e.g. "National Assembly of Nigeria"). Only real, photographable people, buildings or places. Never abstract ideas.
- importance: 1-10. 9-10 national turning point or global headline; 6-8 significant national story; 4-5 notable; 1-3 minor/local/routine.

Return ONLY this JSON:
{"is_political":true,"country_iso":"NG","importance":7,"headline":"","seo_title":"","meta_description":"","dek":"","key_points":[""],"body":[""],"analysis":[""],"background":"","what_next":"","question":null,"tags":[""],"actors":[""],"image_subjects":[""],"slug_keywords":"three to six words","completeness":"complete","incomplete_reason":null}`;

export async function writeVoxpolisArticle(input: {
  sourceTitle: string;
  sourceText: string;
  sourceName: string;
  publishedAt?: string;
  deskCountry: string; // ISO code or WORLD
}): Promise<EditorialPiece> {
  const countryHint =
    input.deskCountry === 'WORLD'
      ? 'This came from an international desk. Set country_iso to the ISO-3166 alpha-2 code of the ONE country whose politics the story is mainly about.'
      : `This came from the ${input.deskCountry} desk. Use country_iso="${input.deskCountry}" unless the story is clearly about another country's politics.`;

  const user = `${countryHint}
Source outlet: ${input.sourceName}
Published: ${input.publishedAt || 'unknown'}
Today: ${new Date().toISOString().slice(0, 10)}
Source headline: ${input.sourceTitle}

Source text:
${input.sourceText}`;

  const { text, provider } = await callNewsroomLLM(SYSTEM, user);
  const raw = parseJsonReply<any>(text);

  const arr = (v: any) => (Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : []).map((x: any) => String(x).trim()).filter(Boolean);
  const str = (v: any) => (typeof v === 'string' ? v.trim() : '');

  return {
    is_political: raw.is_political !== false,
    country_iso: str(raw.country_iso).toUpperCase().slice(0, 2),
    importance: Math.max(1, Math.min(10, Number(raw.importance) || 5)),
    headline: str(raw.headline),
    seo_title: str(raw.seo_title),
    meta_description: str(raw.meta_description),
    dek: str(raw.dek),
    key_points: arr(raw.key_points).slice(0, 5),
    body: arr(raw.body),
    analysis: arr(raw.analysis),
    background: str(raw.background),
    what_next: str(raw.what_next),
    question: str(raw.question) || null,
    tags: arr(raw.tags).slice(0, 6),
    actors: arr(raw.actors).slice(0, 10),
    image_subjects: arr(raw.image_subjects).slice(0, 3),
    slug_keywords: str(raw.slug_keywords),
    completeness: raw.completeness === 'incomplete' ? 'incomplete' : 'complete',
    incomplete_reason: raw.incomplete_reason || null,
    provider,
  };
}

/** Quality gates. Returns a list of problems; empty list = publishable. */
export function checkPiece(piece: EditorialPiece, sourceTitle: string, sourceText: string, minImportance: number): string[] {
  const problems: string[] = [];
  if (!piece.is_political) problems.push('not political');
  if (piece.completeness === 'incomplete') problems.push(`incomplete: ${piece.incomplete_reason || 'source too thin'}`);
  if (!ALL_COUNTRIES.some((c) => c.code === piece.country_iso)) problems.push(`unknown country "${piece.country_iso}"`);
  if (piece.importance < minImportance) problems.push(`importance ${piece.importance} below ${minImportance}`);
  if (piece.headline.length < 30) problems.push('headline too short');
  if (piece.body.length < 3) problems.push('body has fewer than 3 paragraphs');

  const bodyWords = piece.body.join(' ').split(/\s+/).filter(Boolean).length;
  if (bodyWords < 200) problems.push(`body only ${bodyWords} words`);
  if (piece.analysis.join(' ').split(/\s+/).filter(Boolean).length < 80) problems.push('analysis too thin');

  const everything = [piece.headline, piece.dek, ...piece.key_points, ...piece.body, ...piece.analysis, piece.background, piece.what_next].join('\n');
  if (/\[\.\.\.\]|read more|click here|continue reading/i.test(everything)) problems.push('teaser text present');

  // Originality: no 8+ word run copied from the source, outside quotation marks.
  const unquoted = everything.replace(/["“][^"”]{0,200}["”]/g, ' ');
  const overlaps = findConsecutiveWordOverlaps(`${sourceTitle}\n${sourceText}`, unquoted, 8);
  if (overlaps.length > 0) problems.push(`copied wording: "${overlaps[0].span}"`);

  return problems;
}
