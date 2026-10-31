import { supabaseAdmin } from '@/lib/supabase/admin';
import { callNewsroomLLM, parseJsonReply } from './llm';
import { extractSourceArticle } from './extract';
import { extractFacts } from './facts';

/**
 * Accuracy check: a separate AI pass reads the draft sentence by sentence next to the original reports
 * and lists every sentence the reports do not support. Results are stored on the article
 * (articles.fidelity) and shown to the editor as amber items with the exact sentence.
 */

export type FidelityProblem = 'not_in_sources' | 'meaning_changed' | 'wrong_detail' | 'unattributed_opinion' | 'invented_reaction' | 'loaded_framing';

export interface FidelityIssue {
  sentence: string;
  problem: FidelityProblem;
  explanation: string;
  source_says?: string | null;
}

export interface Fidelity {
  checked_at: string;
  provider: string;
  issues: FidelityIssue[];
  status: 'done' | 'no_sources' | 'failed';
  note?: string;
}

interface SourceText {
  name: string;
  url: string;
  title: string;
  text: string;
}

const PROBLEMS: FidelityProblem[] = ['not_in_sources', 'meaning_changed', 'wrong_detail', 'unattributed_opinion', 'invented_reaction', 'loaded_framing'];

const SYSTEM = `You are the fact-checker at a political news site. You compare a DRAFT story with the ORIGINAL REPORTS it was written from.
Go through the draft sentence by sentence. Flag a sentence only when one of these is true:
- not_in_sources: it states a fact, event, figure or claim that no report contains.
- meaning_changed: it says something the reports say, but stronger, weaker or different (e.g. "said" became "admitted", "plans to" became "will", an allegation stated as fact, "about 300" became "300").
- wrong_detail: a name, title, number, date or place differs from the reports.
- unattributed_opinion: an opinion or argument given to unnamed people ("critics argue", "many believe") that the reports do not give.
- invented_reaction: a response, reaction or "other side" position that no report contains.
- loaded_framing: emotive or one-sided wording the reports don't use, presented as the site's own voice.
Do NOT flag: correct paraphrases; the labelled analysis section when it only interprets reported facts; stable, certain general background (e.g. what an institution does); sentences saying the reports did not include a response.
Copy each flagged sentence EXACTLY as it appears in the draft. For source_says, quote the closest line from the reports (max 30 words) or null if nothing relevant.
Be precise and conservative: a missed problem is bad, a false alarm wastes the editor's time. If the draft is faithful, return an empty list.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    issues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sentence: { type: 'STRING' },
          problem: { type: 'STRING', enum: PROBLEMS },
          explanation: { type: 'STRING' },
          source_says: { type: 'STRING', nullable: true },
        },
        required: ['sentence', 'problem', 'explanation'],
        propertyOrdering: ['sentence', 'problem', 'explanation', 'source_says'],
      },
    },
  },
  required: ['issues'],
};

function draftText(a: any): string {
  const parts: string[] = [`HEADLINE: ${a.title || ''}`, `SUMMARY: ${a.dek || a.snippet || ''}`];
  if ((a.key_points || []).length) parts.push(`AT A GLANCE:\n- ${(a.key_points || []).join('\n- ')}`);
  if (a.lead || (a.sections || []).length) {
    if (a.lead) parts.push(a.lead);
    (a.sections || []).forEach((s: any) => parts.push(`${s.kind === 'analysis' ? '[ANALYSIS] ' : ''}${s.heading}\n${(s.paragraphs || []).join('\n\n')}`));
  } else {
    parts.push(a.content || '');
    if (a.analysis) parts.push(`[ANALYSIS]\n${a.analysis}`);
    if (a.background) parts.push(a.background);
  }
  const watch = a.what_to_watch || a.what_next;
  if (watch) parts.push(`WHAT TO WATCH: ${watch}`);
  return parts.filter(Boolean).join('\n\n');
}

/** The reports behind a draft: the private copy saved at ingest, or (for the editor's own stories) read from the links now. */
export async function sourceTexts(a: any): Promise<SourceText[]> {
  const { data } = await supabaseAdmin.from('article_source_texts').select('sources').eq('article_id', a.id).maybeSingle();
  const stored: SourceText[] = (data?.sources as SourceText[]) || [];
  // Newer stories list their reports in "sources"; older ones only have source_url. Fix "&amp;" saved by old feeds.
  const listed: { name: string; url: string }[] = a.sources?.length ? a.sources : a.source_url ? [{ name: a.source_name || 'Original report', url: a.source_url }] : [];
  const links = listed
    .map((l) => ({ name: l.name, url: String(l.url || '').replace(/&amp;/g, '&') }))
    .filter((l) => /^https?:\/\//.test(l.url));
  const missing = links.filter((l) => !stored.some((s) => s.url === l.url)).slice(0, 4);
  if (!missing.length) return stored;

  const read = await Promise.all(missing.map((l) => extractSourceArticle(l.url, '').catch(() => null)));
  const fresh: SourceText[] = [];
  read.forEach((r, i) => {
    if (r?.ok && r.text) fresh.push({ name: missing[i].name, url: missing[i].url, title: r.title, text: r.text });
  });
  const all = [...stored, ...fresh];
  if (fresh.length) {
    await supabaseAdmin.from('article_source_texts').upsert({ article_id: a.id, sources: all, updated_at: new Date().toISOString() });
    // The number/name check can now run for this story too.
    await supabaseAdmin
      .from('articles')
      .update({ source_facts: extractFacts(all.map((s) => `${s.title}\n${s.text}`).join('\n')) })
      .eq('id', a.id);
  }
  return all;
}

export async function verifyArticle(id: string): Promise<Fidelity> {
  const { data: a } = await supabaseAdmin
    .from('articles')
    .select('id, title, dek, snippet, key_points, lead, sections, content, analysis, background, what_to_watch, what_next, sources, source_url, source_name')
    .eq('id', id)
    .maybeSingle();
  if (!a) throw new Error('Story not found');

  let result: Fidelity;
  const sources = await sourceTexts(a);
  if (!sources.length) {
    result = { checked_at: new Date().toISOString(), provider: '', issues: [], status: 'no_sources', note: 'No readable original report to compare with.' };
  } else {
    const reports = sources
      .slice(0, 4)
      .map((s, i) => `REPORT ${i + 1} (${s.name}): ${s.title}\n${s.text.slice(0, 9000)}`)
      .join('\n\n-----\n\n');
    try {
      let reply = await callNewsroomLLM(SYSTEM, `ORIGINAL REPORTS:\n\n${reports}\n\n=====\n\nDRAFT:\n\n${draftText(a)}`, SCHEMA);
      let raw: any;
      try {
        raw = parseJsonReply<any>(reply.text);
      } catch {
        reply = await callNewsroomLLM(SYSTEM, `ORIGINAL REPORTS:\n\n${reports}\n\n=====\n\nDRAFT:\n\n${draftText(a)}`, SCHEMA);
        raw = parseJsonReply<any>(reply.text);
      }
      const issues: FidelityIssue[] = (Array.isArray(raw?.issues) ? raw.issues : [])
        .map((x: any) => ({
          sentence: String(x?.sentence || '').trim(),
          problem: PROBLEMS.includes(x?.problem) ? x.problem : 'not_in_sources',
          explanation: String(x?.explanation || '').trim().slice(0, 400),
          source_says: x?.source_says ? String(x.source_says).trim().slice(0, 300) : null,
        }))
        .filter((x: FidelityIssue) => x.sentence.length > 8)
        .slice(0, 12);
      result = { checked_at: new Date().toISOString(), provider: reply.provider, issues, status: 'done' };
    } catch (e: any) {
      result = { checked_at: new Date().toISOString(), provider: '', issues: [], status: 'failed', note: String(e?.message || e).slice(0, 200) };
    }
  }

  await supabaseAdmin.from('articles').update({ fidelity: result }).eq('id', id);
  return result;
}
