import { callNewsroomLLM, parseJsonReply } from './llm';
import { sourceTexts } from './verify';

/**
 * "Fix it for me": corrects only the problems the checker found, using the original reports.
 * Unsupported sentences are corrected from the reports or removed; nothing new is invented.
 * Problems the reports show are actually fine (e.g. a number written differently) come back as verified.
 */

export interface FixProblem {
  key?: string;
  field: string;
  text: string;
}

export interface StoryFields {
  title: string;
  dek: string;
  key_points: string[];
  meta_description: string;
  lead?: string[];
  sections?: { heading: string; kind: string; paragraphs: string[] }[];
  what_to_watch?: string;
  content?: string;
  analysis?: string;
  background?: string;
  what_next?: string;
}

export interface FixResult {
  fields: StoryFields;
  changes: { before: string; after: string; reason: string }[];
  verified: { key: string; evidence: string }[];
  unresolved: string[];
}

const SYSTEM = `You are the copy editor at Voxpolis, a political news site. You receive the ORIGINAL REPORTS, a STORY (JSON) and a list of PROBLEMS found by the checker.
Fix ONLY the listed problems. Leave every other sentence, heading and paragraph exactly as it is.
How to fix:
- A sentence not supported by the reports, or an opinion/argument given to unnamed people ("critics argue", "supporters note"): if a report says it and names who, attribute it to them; otherwise DELETE the sentence.
- A sentence whose meaning changed: rewrite it so it says what the reports say, in your own words.
- A loaded or opinion word: replace it with neutral wording, or move the sentence into the analysis section.
- A number or name "not in the original reports": if the reports confirm it (perhaps written differently, e.g. "2.5 million" for 2500000), keep it and add its key to verified_correct with the evidence; if the reports give a different value, correct it; if they don't mention it, remove it.
- "No Analysis section": add ONE section with kind "analysis" and a specific heading: 2 short paragraphs explaining what the reported facts mean. Use only facts in the reports; no unnamed voices, no predictions.
- "No At a glance points": write 2-4 one-sentence points from the story.
- Google description too short/long: rewrite meta_description to 140-158 characters.
- Headline too long or too short: rewrite title to 55-90 characters, who did what.
Rules: never add facts, quotes, reactions or figures that are not in the reports. Never copy 7 or more consecutive words from a report except short attributed quotes. Plain, neutral English.
Return the WHOLE story with the same fields you received (unchanged parts copied exactly), plus:
- changes: each edit you made: before (the original sentence, or "" when added), after (the new text, or "" when deleted), reason (one short plain sentence a non-expert understands).
- verified_correct: keys of problems that the reports show are correct, with a short evidence quote.
- unresolved: problems you could not fix, in one plain sentence each.`;

const STR = { type: 'STRING' };
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: STR,
    dek: STR,
    key_points: { type: 'ARRAY', items: STR },
    meta_description: STR,
    lead: { type: 'ARRAY', items: STR, nullable: true },
    sections: {
      type: 'ARRAY',
      nullable: true,
      items: {
        type: 'OBJECT',
        properties: { heading: STR, kind: { type: 'STRING', enum: ['report', 'response', 'context', 'analysis', 'reaction', 'numbers'] }, paragraphs: { type: 'ARRAY', items: STR } },
        required: ['heading', 'kind', 'paragraphs'],
      },
    },
    what_to_watch: { type: 'STRING', nullable: true },
    content: { type: 'STRING', nullable: true },
    analysis: { type: 'STRING', nullable: true },
    background: { type: 'STRING', nullable: true },
    what_next: { type: 'STRING', nullable: true },
    changes: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { before: STR, after: STR, reason: STR }, required: ['before', 'after', 'reason'] },
    },
    verified_correct: { type: 'ARRAY', items: { type: 'OBJECT', properties: { key: STR, evidence: STR }, required: ['key', 'evidence'] } },
    unresolved: { type: 'ARRAY', items: STR },
  },
  required: ['title', 'dek', 'key_points', 'meta_description', 'changes', 'verified_correct', 'unresolved'],
};

export async function autoFixStory(article: { id: string; sources?: any }, story: StoryFields, problems: FixProblem[]): Promise<FixResult> {
  const sources = await sourceTexts(article);
  if (!sources.length) throw new Error('The original reports could not be read, so nothing can be checked against them. Add a source link and try again.');
  const reports = sources
    .slice(0, 4)
    .map((s, i) => `REPORT ${i + 1} (${s.name}): ${s.title}\n${s.text.slice(0, 9000)}`)
    .join('\n\n-----\n\n');
  const list = problems.map((p, i) => `${i + 1}. [part: ${p.field}]${p.key ? ` [key: ${p.key}]` : ''} ${p.text}`).join('\n');
  const user = `ORIGINAL REPORTS:\n\n${reports}\n\n=====\n\nSTORY:\n${JSON.stringify(story)}\n\n=====\n\nPROBLEMS TO FIX:\n${list}`;

  let reply = await callNewsroomLLM(SYSTEM, user, SCHEMA);
  let raw: any;
  try {
    raw = parseJsonReply<any>(reply.text);
  } catch {
    reply = await callNewsroomLLM(SYSTEM, user, SCHEMA);
    raw = parseJsonReply<any>(reply.text);
  }
  const str = (v: any, fallback = '') => (typeof v === 'string' ? v.trim() : fallback);
  const arr = (v: any) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);

  const fields: StoryFields = {
    title: str(raw.title, story.title) || story.title,
    dek: str(raw.dek, story.dek),
    key_points: arr(raw.key_points).length ? arr(raw.key_points) : story.key_points,
    meta_description: str(raw.meta_description, story.meta_description),
  };
  if (story.lead !== undefined || story.sections !== undefined) {
    fields.lead = Array.isArray(raw.lead) ? arr(raw.lead) : story.lead || [];
    fields.sections = (Array.isArray(raw.sections) ? raw.sections : story.sections || [])
      .map((x: any) => ({ heading: str(x?.heading), kind: str(x?.kind, 'report') || 'report', paragraphs: arr(x?.paragraphs) }))
      .filter((x: any) => x.heading && x.paragraphs.length);
    fields.what_to_watch = raw.what_to_watch == null ? story.what_to_watch || '' : str(raw.what_to_watch);
  } else {
    fields.content = str(raw.content, story.content) || story.content;
    fields.analysis = raw.analysis == null ? story.analysis : str(raw.analysis);
    fields.background = raw.background == null ? story.background : str(raw.background);
    fields.what_next = raw.what_next == null ? story.what_next : str(raw.what_next);
  }

  const keys = new Set(problems.map((p) => p.key).filter(Boolean));
  return {
    fields,
    changes: (Array.isArray(raw.changes) ? raw.changes : [])
      .map((c: any) => ({ before: str(c?.before), after: str(c?.after), reason: str(c?.reason) }))
      .filter((c: any) => c.before !== c.after)
      .slice(0, 30),
    verified: (Array.isArray(raw.verified_correct) ? raw.verified_correct : [])
      .map((v: any) => ({ key: str(v?.key), evidence: str(v?.evidence).slice(0, 300) }))
      .filter((v: any) => keys.has(v.key) && v.evidence),
    unresolved: arr(raw.unresolved).slice(0, 10),
  };
}
