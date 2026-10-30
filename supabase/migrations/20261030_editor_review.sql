-- Editor review: AI-written stories stay out of Google until the editor approves them.
alter table public.articles
  add column if not exists review_status text not null default 'pending', -- pending | approved | rejected
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;
update public.articles set review_status = 'approved', reviewed_at = coalesce(reviewed_at, created_at), reviewed_by = coalesce(reviewed_by, 'Voxpolis Editor')
  where source_name = 'Voxpolis' and review_status = 'pending';
create index if not exists articles_review_idx on public.articles (review_status, created_at desc);
