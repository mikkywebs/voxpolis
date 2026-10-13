-- ============================================================================
-- VOXPOLIS MIGRATION: Durable Persistence for CMS Pages, Columnists, and Ads
-- Migration File: supabase/migrations/20261013_durable_cms_columnist_ads.sql
-- Date: 2026-10-13
--
-- PURPOSE:
-- Replaces ephemeral serverless local filesystem JSON writes with durable
-- Supabase PostgreSQL tables for:
--   1. public.site_pages (CMS page content for about, contact, privacy, terms, corrections)
--   2. public.columnist_submissions (Guest op-ed & columnist drafts and moderation queue)
--   3. public.ads (Sponsor campaign management, target slots, and metrics)
--   4. public.ad_rates (Editorial rate cards for advertising tiers)
--
-- SAFEGUARDS:
-- - Uses CREATE TABLE IF NOT EXISTS (never drops, alters, or truncates existing tables)
-- - Enables Row Level Security (RLS) on all 4 tables
-- - Columnist submissions and ad campaigns are strictly private (no public SELECT; service role only)
-- - Public read access granted only to published CMS pages and rate cards
-- - Seeds default CMS pages and rate cards using ON CONFLICT DO NOTHING
-- ============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. CMS SITE PAGES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_pages (
    page_key TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

-- Allow public read access to CMS pages
DROP POLICY IF EXISTS "Allow public read on site_pages" ON public.site_pages;
CREATE POLICY "Allow public read on site_pages"
    ON public.site_pages
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Seed initial CMS pages from baseline configuration
INSERT INTO public.site_pages (page_key, data)
VALUES
  ('about', '{
    "badge": "Global Independent News & Civic Voice",
    "title": "Unbiased Political News Tailored to Your Nation",
    "subtitle": "Voxpolis delivers real-time, independent political coverage and executive fact analysis across global nations with direct civic polling.",
    "mission": "Our mission is to bring concise, factual news straight to citizens'' doorsteps worldwide, with balanced regional perspectives and civic participation without corporate paywalls.",
    "founded_year": "2026",
    "headquarters": "Abuja, Nigeria",
    "coverage_scope": "Global Coverage across 119 Nations"
  }'::jsonb),
  ('contact', '{
    "title": "Contact Voxpolis Editorial & Operations",
    "subtitle": "Reach out directly to our editorial team, corrections desk, or executive management.",
    "email": "contact@voxpolis.app",
    "desk_phone": "+234 (0) 906 000 0000",
    "headquarters_address": "Plot 42, Central Business District, Abuja, Federal Capital Territory, Nigeria",
    "press_inquiries": "press@voxpolis.app",
    "response_time": "Typically within 24 business hours"
  }'::jsonb),
  ('privacy', '{
    "title": "Privacy Policy & Data Protection Standards",
    "subtitle": "Voxpolis adheres to strict global data privacy standards, GDPR, and NDPR protocols.",
    "content": "Voxpolis values your privacy. We collect minimal personal data required for account authentication and localized political news delivery. We do not sell your personal data to third parties. Member polling data is aggregated and anonymized for civic sentiment representation."
  }'::jsonb),
  ('terms', '{
    "title": "Terms of Service & Reader Conduct",
    "subtitle": "Fair use terms for readers, members, and accredited columnists.",
    "content": "By accessing Voxpolis, you agree to engage in civilized, constructive civic discourse. Columnist submissions must be original, 500+ words, respectful, and adhere to truthfulness and editorial integrity. Hate speech, abusive language, and unauthorized promotional links are strictly prohibited."
  }'::jsonb)
ON CONFLICT (page_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. GUEST & COLUMNIST SUBMISSIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.columnist_submissions (
    id TEXT PRIMARY KEY,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    author_bio TEXT DEFAULT '',
    author_avatar TEXT DEFAULT '/breaking-news-banner.png',
    country_code TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    snippet TEXT NOT NULL,
    content TEXT NOT NULL,
    featured_image_url TEXT DEFAULT '/voxpolis-fallback-1.png',
    word_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('pending_review', 'published', 'declined')) DEFAULT 'pending_review',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient dashboard review and country desk queries
CREATE INDEX IF NOT EXISTS idx_columnist_status_created 
    ON public.columnist_submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_columnist_country 
    ON public.columnist_submissions (country_code);

-- Row Level Security (Privacy Shield: Service Role only; no public anon/auth access)
ALTER TABLE public.columnist_submissions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. ADVERTISING CAMPAIGNS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ads (
    id TEXT PRIMARY KEY,
    sponsor_name TEXT NOT NULL,
    ad_title TEXT NOT NULL,
    tagline TEXT DEFAULT '',
    target_url TEXT NOT NULL,
    slot_location TEXT NOT NULL CHECK (slot_location IN ('top_horizontal', 'square_300', 'skyscraper')),
    desktop_image_url TEXT NOT NULL,
    mobile_image_url TEXT,
    price_paid NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    target_country TEXT DEFAULT 'ALL',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    is_active BOOLEAN DEFAULT TRUE,
    impressions_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for live ad slot resolution
CREATE INDEX IF NOT EXISTS idx_ads_slot_active_dates 
    ON public.ads (slot_location, is_active, start_date, end_date);

-- Row Level Security (Commercial Privacy Shield: Service Role only; no public anon/auth access)
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on active ads" ON public.ads;

-- ----------------------------------------------------------------------------
-- 4. ADVERTISING RATE CARDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ad_rates (
    id TEXT PRIMARY KEY DEFAULT 'default',
    rates JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.ad_rates ENABLE ROW LEVEL SECURITY;

-- Allow public read access to rate cards
DROP POLICY IF EXISTS "Allow public read on ad_rates" ON public.ad_rates;
CREATE POLICY "Allow public read on ad_rates"
    ON public.ad_rates
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Seed initial baseline rate card
INSERT INTO public.ad_rates (id, rates)
VALUES ('default', '{
  "currency": "USD",
  "top_horizontal": {
    "desktop_size": "728x90",
    "desktop_price": 250,
    "mobile_size": "320x100",
    "mobile_price": 150,
    "billing_period": "per week"
  },
  "square_300": {
    "desktop_size": "300x300",
    "desktop_price": 200,
    "mobile_size": "300x300",
    "mobile_price": 120,
    "billing_period": "per week"
  },
  "skyscraper": {
    "desktop_size": "160x600",
    "desktop_price": 180,
    "mobile_size": "N/A",
    "mobile_price": 0,
    "billing_period": "per week"
  }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
