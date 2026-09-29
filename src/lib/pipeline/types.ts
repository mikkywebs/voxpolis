export type ContentType = 'single_story' | 'listicle';
export type FactStatus = 'confirmed' | 'claimed' | 'unverified';
export type CompletenessStatus = 'complete' | 'incomplete';

export interface FactAnalysisItem {
  fact: string;
  status: FactStatus;
  who_said?: string;
}

export interface ListicleItem {
  position: number;
  title: string;
  summary: string;
  source?: string;
}

export interface AnthropicRewritePayload {
  content_type: ContentType;
  headline: string;
  dek: string;
  body_markdown: string;
  executive_summary: string;
  fact_analysis: FactAnalysisItem[];
  why_it_matters: string;
  legislative_scope: string | null;
  items: ListicleItem[];
  actors: string[];
  tags: string[];
  country_iso?: string;
  suggested_slug_keywords: string;
  completeness: CompletenessStatus;
  incomplete_reason?: string | null;
}

export interface ScrapedSourcePage {
  source_url: string;
  source_name: string;
  source_published_at: string;
  source_headline: string;
  extracted_full_text: string;
  image_url?: string;
  character_count: number;
  word_count: number;
  is_valid: boolean;
  reject_reason?: string;
}

export interface GateValidationResult {
  passed: boolean;
  errors: string[];
}

export interface PipelineArticleRecord {
  id: string;
  slug: string;
  source_url: string;
  source_name: string;
  source_published_at: string;
  content_type: ContentType;
  headline: string;
  dek: string;
  body_markdown: string;
  executive_summary: string;
  fact_analysis: FactAnalysisItem[];
  why_it_matters: string;
  legislative_scope: string | null;
  items: ListicleItem[];
  actors: string[];
  tags: string[];
  country_code: string;
  language: string;
  category: string;
  original_image_url?: string;
  image_credit?: string;
  image_source_url?: string;
  word_count: number;
  read_minutes: number;
  created_at: string;
  status: 'published' | 'incomplete' | 'rejected' | 'unpublished';
  incomplete_reason?: string;
}

export interface RedirectRecord {
  old_slug: string;
  new_slug: string;
  created_at: string;
}
