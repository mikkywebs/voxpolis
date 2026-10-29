-- Voxpolis editorial upgrade (additive, safe for the live site).
-- Adds structured fields for original reporting + analysis, SEO fields,
-- and an ingest log so you can see why stories were accepted or rejected.

alter table public.articles
  add column if not exists dek text,
  add column if not exists key_points text[] default '{}',
  add column if not exists analysis text,
  add column if not exists background text,
  add column if not exists what_next text,
  add column if not exists seo_title text,
  add column if not exists meta_description text,
  add column if not exists importance smallint,
  add column if not exists actors text[] default '{}',
  add column if not exists source_published_at timestamptz,
  add column if not exists word_count integer,
  add column if not exists editorial_version smallint default 1,
  add column if not exists status text default 'published',
  -- Licensed photo credit (Wikimedia Commons). Publisher photos are never used.
  add column if not exists image_credit text,
  add column if not exists image_license text,
  add column if not exists image_page_url text;

create index if not exists articles_country_created_idx
  on public.articles (country_code, created_at desc);
create index if not exists articles_status_created_idx
  on public.articles (status, created_at desc);
create unique index if not exists articles_source_url_uidx
  on public.articles (source_url);

create table if not exists public.ingest_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  country_code text not null,
  source_url text,
  source_name text,
  outcome text not null,      -- published | skipped | rejected | error
  reason text,
  article_slug text,
  duration_ms integer
);

create index if not exists ingest_log_created_idx on public.ingest_log (created_at desc);
create index if not exists ingest_log_source_idx on public.ingest_log (source_url);

-- Only the server (service role) touches the log.
alter table public.ingest_log enable row level security;
