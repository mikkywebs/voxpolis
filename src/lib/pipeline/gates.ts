import { AIRewritePayload, GateValidationResult, ScrapedSourcePage } from './types';
import { findConsecutiveWordOverlaps } from './overlap';

export function validateQualityGates(
  payload: AIRewritePayload,
  scraped: ScrapedSourcePage
): GateValidationResult {
  const errors: string[] = [];

  // Gate 0: Completeness flag from AI rewriter
  if (payload.completeness === 'incomplete') {
    errors.push(`AI rewriter flagged brief as incomplete: ${payload.incomplete_reason || 'Source missing details'}`);
  }

  // Gate 1: Word Count for Single Story (minimum 220 words)
  const bodyWords = payload.body_markdown.trim().split(/\s+/).filter(Boolean).length;
  if (payload.content_type === 'single_story' && bodyWords < 220) {
    errors.push(`Single story body_markdown has only ${bodyWords} words (minimum required: 220)`);
  }

  // Gate 2: Listicle Items Count (>= 8 if title claims "10 things", or >= 3 for general listicle)
  if (payload.content_type === 'listicle') {
    const titleClaims10 = (payload.headline + ' ' + scraped.source_headline).match(/\b(10|ten)\b/i);
    if (titleClaims10 && payload.items.length < 8) {
      errors.push(`Listicle promised 10 items but emitted only ${payload.items.length} items (minimum required: 8)`);
    } else if (payload.items.length < 3) {
      errors.push(`Listicle emitted insufficient items (${payload.items.length} items)`);
    }
  }

  // Gate 3: No [...] or … or "read more" in public fields
  const publicFields = [
    payload.headline,
    payload.dek,
    payload.body_markdown,
    payload.executive_summary,
    payload.why_it_matters,
    payload.legislative_scope || '',
  ];

  for (const field of publicFields) {
    if (field.includes('[...]') || field.includes('…') || field.match(/\b(read more|click here to read|continue reading)\b/i)) {
      errors.push(`Public field contains teaser marker ([...], …, read more): "${field.slice(0, 50)}..."`);
      break;
    }
  }

  // Gate 4: Distinct Summary / Dek / First Body Paragraph
  const normSummary = payload.executive_summary.trim().toLowerCase();
  const normDek = payload.dek.trim().toLowerCase();
  const firstParagraph = payload.body_markdown.split('\n\n')[0]?.trim().toLowerCase() || '';

  if (normSummary && normDek && normSummary === normDek) {
    errors.push('executive_summary is identical to dek');
  }
  if (normSummary && firstParagraph && normSummary === firstParagraph) {
    errors.push('executive_summary is identical to the first paragraph of body_markdown');
  }

  // Gate 5: source_url present
  if (!scraped.source_url || !scraped.source_url.startsWith('http')) {
    errors.push('source_url is missing or invalid');
  }

  // Gate 6: country_iso set
  if (!payload.country_iso && !scraped.source_name) {
    errors.push('country_iso / country code is missing');
  }

  // Gate 7: Zero Copyright / Verbatim Overlap gate (Strict 8-word consecutive overlap ceiling)
  const sourceText = `${scraped.source_headline}\n${scraped.extracted_full_text}`;

  // Check body markdown against source text
  const bodyOverlaps = findConsecutiveWordOverlaps(sourceText, payload.body_markdown, 8);
  if (bodyOverlaps.length > 0) {
    errors.push(
      `Consecutive 8+ word overlap detected between body and source (${bodyOverlaps.length} span(s) found, e.g. "${bodyOverlaps[0].span}")`
    );
  }

  // Check headline against source text
  const headlineOverlaps = findConsecutiveWordOverlaps(sourceText, payload.headline, 8);
  if (headlineOverlaps.length > 0) {
    errors.push(
      `Consecutive 8+ word overlap detected between headline and source: "${headlineOverlaps[0].span}"`
    );
  }

  // Check executive summary / dek against source text
  const summaryOverlaps = findConsecutiveWordOverlaps(sourceText, `${payload.dek} ${payload.executive_summary}`, 8);
  if (summaryOverlaps.length > 0) {
    errors.push(
      `Consecutive 8+ word overlap detected between summary/dek and source: "${summaryOverlaps[0].span}"`
    );
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}
