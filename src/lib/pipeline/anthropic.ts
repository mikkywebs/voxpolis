import { AnthropicRewritePayload, ScrapedSourcePage } from './types';

const SYSTEM_PROMPT = `You are the automatic Voxpolis rewrite engine for a global political news app. Produce an original brief for readers in the story’s country, in clear English.
Rules:
- Use only extracted_full_text. If truncated, completeness=incomplete. Do not invent list items or figures.
- Do not copy any source sentence of 20+ words.
- Do not paste the headline into the body.
- Separate confirmed fact from allegation; attribute speakers.
- Keep names, dates, figures, places exact.
- No campaign tone. No generic politics filler.
- legislative_scope = null unless bill, vote, gazette, or binding court/regulator order.
- Listicle: one object per item actually in the source. If source promised 10 and text has 1, incomplete.
- JSON only.

JSON:
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
  "country_iso": "",
  "suggested_slug_keywords": "",
  "completeness": "complete|incomplete",
  "incomplete_reason": null
}`;

export async function rewriteWithAnthropic(
  scraped: ScrapedSourcePage,
  targetCountryCode: string = 'NG'
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
    target_country_iso: targetCountryCode,
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
    if (!parsed.country_iso) parsed.country_iso = targetCountryCode;

    return parsed;
  } catch (err: any) {
    throw new Error(`Failed to parse Anthropic JSON output: ${err.message}. Raw output: ${textContent.slice(0, 300)}`);
  }
}
