alter table public.articles add column if not exists checked_items text[] not null default '{}';
