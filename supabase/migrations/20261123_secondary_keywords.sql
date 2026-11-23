-- Additional keywords (related searches) for the SEO editor.
alter table public.articles add column if not exists secondary_keywords text[] not null default '{}';
