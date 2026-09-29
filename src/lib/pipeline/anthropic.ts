import { AnthropicRewritePayload, ScrapedSourcePage } from './types';

const SYSTEM_PROMPT = `You are the automatic Voxpolis rewrite engine. Turn one full source article into an original, clear brief for Nigerian and African readers.
Rules:
- Use only extracted_full_text. If it is truncated or a teaser, return completeness=incomplete. Do not invent facts or missing list items.
- Do not copy any source sentence of 20+ words.
- Do not paste the headline into the body.
- Separate confirmed fact from allegation. Attribute speakers.
- Keep names, dates, figures, places exact. If a number is cut off, mark unverified; do not guess.
- No campaign tone, no sermon, no generic politics filler.
- legislative_scope must be null unless the story is a bill, vote, gazette, or binding court/regulatory order.
- Listicle: emit one object per item actually present in the source. If the source promised 10 and the text only contains 1, completeness=incomplete.
- Output JSON only.

JSON shape:
{
  "content_type": "single_story|listicle",
  "headline": "",
  "dek": "",
  "body_markdown": "",
  "executive_summary": "",
  "fact_analysis": [{"fact":"","status":"confirmed|claimed|unverified","who_said":""}],
  "why_it_matters": "",
  "legislative_scope": null,
  "items": [{"position":1,"title":"","summary":"","source":""}],
  "actors": [],
  "tags": [],
  "suggested_slug_keywords": "",
  "completeness": "complete|incomplete",
  "incomplete_reason": null
}`;

export async function rewriteWithAnthropic(
  scraped: ScrapedSourcePage
): Promise<AnthropicRewritePayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('ANTHROPIC_API_KEY environment variable is not configured');
  }

  const userPayload = {
    source_name: scraped.source_name,
    source_url: scraped.source_url,
    source_published_at: scraped.source_published_at,
    source_headline: scraped.source_headline,
    extracted_full_text: scraped.extracted_full_text,
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(userPayload),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.content?.[0]?.text || '';

  // Extract JSON from response text (handling code fences if any)
  let jsonString = textContent.trim();
  if (jsonString.includes('```json')) {
    jsonString = jsonString.split('```json')[1].split('```')[0].trim();
  } else if (jsonString.includes('```')) {
    jsonString = jsonString.split('```')[1].split('```')[0].trim();
  }

  try {
    const parsed: AnthropicRewritePayload = JSON.parse(jsonString);

    // Basic Structure Sanitization
    if (!parsed.content_type) parsed.content_type = 'single_story';
    if (!Array.isArray(parsed.fact_analysis)) parsed.fact_analysis = [];
    if (!Array.isArray(parsed.items)) parsed.items = [];
    if (!Array.isArray(parsed.actors)) parsed.actors = [];
    if (!Array.isArray(parsed.tags)) parsed.tags = [];

    return parsed;
  } catch (err: any) {
    throw new Error(`Failed to parse Anthropic JSON output: ${err.message}. Raw output: ${textContent.slice(0, 300)}`);
  }
}
