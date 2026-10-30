-- Clean addresses: /<country>/<short-title>. Old slugs are kept for 301 redirects.
alter table public.articles add column if not exists previous_slug text;
create index if not exists articles_previous_slug_idx on public.articles (previous_slug);

-- Drop the "-YYYY-MM-DD-xxxx" tail from newsroom slugs (keeps the old one in previous_slug).
update public.articles a
set previous_slug = a.slug,
    slug = regexp_replace(a.slug, '-\d{4}-\d{2}-\d{2}-[a-z0-9]{4}$', '')
where a.slug ~ '-\d{4}-\d{2}-\d{2}-[a-z0-9]{4}$'
  and not exists (
    select 1 from public.articles b
    where b.slug = regexp_replace(a.slug, '-\d{4}-\d{2}-\d{2}-[a-z0-9]{4}$', '') and b.id <> a.id
  );
