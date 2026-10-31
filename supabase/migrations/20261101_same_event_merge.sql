-- Private copy of the original reports behind each draft (server only, never public):
-- used to merge later reports of the same event into the existing draft.
create table if not exists public.article_source_texts (
  article_id uuid primary key references public.articles(id) on delete cascade,
  sources jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.article_source_texts enable row level security;
revoke all on public.article_source_texts from anon, authenticated;
-- When new reports of a story arrive after the editor has touched it.
alter table public.articles add column if not exists new_reports_at timestamptz;
