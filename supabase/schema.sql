-- Voxpolis Initial Supabase Database Setup Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Site Settings (Branding & Logo Storage URLs)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_logo_url TEXT NOT NULL,
    icon_url TEXT NOT NULL,
    light_logo_url TEXT NOT NULL,
    dark_logo_url TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial row if empty
INSERT INTO public.site_settings (id, full_logo_url, icon_url, light_logo_url, dark_logo_url)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  '/voxpolis-logo-kit/01-original-full-lockup.png',
  '/voxpolis-logo-kit/12-transparent-icon.png',
  '/voxpolis-logo-kit/11-transparent-blog-header.png',
  '/voxpolis-logo-kit/04-blog-header-dark.jpg'
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);

-- 2. Profiles (Extends Auth.Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    primary_country TEXT DEFAULT 'US',
    followed_countries TEXT[] DEFAULT '{}',
    preferred_language TEXT DEFAULT 'en',
    accent_color TEXT DEFAULT 'blue',
    has_submitted_feedback BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Articles Table
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    snippet TEXT NOT NULL,
    content TEXT NOT NULL,
    ai_analysis TEXT NOT NULL,
    read_also_article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
    affiliate_link_url TEXT,
    affiliate_link_label TEXT,
    country_code TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    category TEXT DEFAULT 'politics',
    image_mode TEXT CHECK (image_mode IN ('original', 'ai_generated', 'breaking_logo')) DEFAULT 'original',
    original_image_url TEXT,
    ai_image_url TEXT,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    is_breaking BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    views_count INTEGER DEFAULT 0,
    total_reading_time_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Article Emoji Reactions
CREATE TABLE IF NOT EXISTS public.article_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT CHECK (reaction_type IN ('thumbs_up', 'sad', 'angry', 'insightful')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(article_id, user_id, reaction_type)
);

-- 5. Polls & Poll Votes
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    agree_count INTEGER DEFAULT 0,
    disagree_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vote TEXT CHECK (vote IN ('agree', 'disagree')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(poll_id, user_id)
);

-- 6. Comments & Comment Reactions
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT CHECK (reaction_type IN ('agree', 'disagree', 'angry', 'insightful')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id, reaction_type)
);

-- 7. User Retention & Private Feedback
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative')),
    feedback_text TEXT,
    store_rating_redirected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Storage bucket creation policy comment
-- Storage bucket 'site-assets' can be created in Supabase Dashboard -> Storage
