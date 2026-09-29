import { AnthropicRewritePayload, GateValidationResult, ScrapedSourcePage } from './types';

function extractSentenceSpans(text: string, wordLen: number = 20): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const spans: string[] = [];
  for (let i = 0; i <= words.length - wordLen; i += 5) {
    spans.push(words.slice(i, i + wordLen).join(' '));
  }
  return spans;
}

export function validateQualityGates(
  payload: AnthropicRewritePayload,
  scraped: ScrapedSourcePage
): GateValidationResult {
  const errors: string[] = [];

  // Gate 0: Completeness flag from Anthropic
  if (payload.completeness === 'incomplete') {
    errors.push(`Anthropic flagged brief as incomplete: ${payload.incomplete_reason || 'Source missing details'}`);
  }

  // Gate 1: Word Count for Single Story
  const bodyWords = payload.body_markdown.trim().split(/\s+/).filter(Boolean).length;
  if (payload.content_type === 'single_story' && bodyWords < 220) {
    errors.push(`Single story body_markdown has only ${bodyWords} words (minimum required: 220)`);
  }

  // Gate 2: Listicle Items Count
  if (payload.content_type === 'listicle') {
    const titleClaims10 = (payload.headline + ' ' + scraped.source_headline).match(/\b(10|ten)\b/i);
    if (titleClaims10 && payload.items.length < 8) {
      errors.push(`Listicle promised 10 items but emitted only ${payload.items.length} items (minimum required: 8)`);
    } else if (payload.items.length < 3) {
      errors.push(`Listicle emitted insufficient items (${payload.items.length} items)`);
    }
  }

  // Gate 3: No [...] or … in any public field
  const publicFields = [
    payload.headline,
    payload.dek,
    payload.body_markdown,
    payload.executive_summary,
    payload.why_it_matters,
    payload.legislative_scope || '',
  ];

  for (const field of publicFields) {
    if (field.includes('[...]') || field.includes('…') || field.match(/\b(read more|click here to read)\b/i)) {
      errors.push(`Public field contains teaser marker ([...], …, read more): "${field.slice(0, 50)}..."`);
      break;
    }
  }

  // Gate 4: Distinct Summary / Dek / First Body Paragraph
  const normSummary = payload.executive_summary.trim().toLowerCase();
  const normDek = payload.dek.trim().toLowerCase();
  const firstParagraph = payload.body_markdown.split('\n\n')[0]?.trim().toLowerCase() || '';

  if (normSummary === normDek) {
    errors.push('executive_summary is identical to dek');
  }
  if (normSummary === firstParagraph) {
    errors.push('executive_summary is identical to the first paragraph of body_markdown');
  }

  // Gate 5: source_url set
  if (!scraped.source_url || !scraped.source_url.startsWith('http')) {
    errors.push('source_url is missing or invalid');
  }

  // Gate 6: No 20+ word verbatim span from source
  const sourceSpans = extractSentenceSpans(scraped.extracted_full_text, 20);
  const bodyTextLower = payload.body_markdown.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  for (const span of sourceSpans) {
    if (span.length > 50 && bodyTextLower.includes(span)) {
      errors.push(`Verbatim 20+ word copy detected from source: "${span.slice(0, 60)}..."`);
      break;
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}
