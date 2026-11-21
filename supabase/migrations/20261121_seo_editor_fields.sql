-- SEO story editor: focus keyword and photo alt text.
alter table public.articles add column if not exists focus_keyword text, add column if not exists image_alt text;
