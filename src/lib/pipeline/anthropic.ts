/**
 * Legacy adapter: all rewrite operations now route through src/lib/pipeline/ai.ts
 * using Google Gemini (primary), Kimi, and DeepSeek.
 * Anthropic Claude has been completely eliminated.
 */
import { AIRewritePayload, ScrapedSourcePage } from './types';
import { rewriteWithAI } from './ai';

export async function rewriteWithAnthropic(
  scraped: ScrapedSourcePage,
  targetCountryCode: string = 'NG'
): Promise<AIRewritePayload> {
  return rewriteWithAI(scraped, targetCountryCode);
}
