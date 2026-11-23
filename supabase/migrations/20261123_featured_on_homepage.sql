-- "Feature on homepage" switch in the editor.
alter table public.articles add column if not exists is_featured boolean not null default false, add column if not exists featured_at timestamptz;
create index if not exists articles_featured_idx on public.articles (featured_at desc) where is_featured;
