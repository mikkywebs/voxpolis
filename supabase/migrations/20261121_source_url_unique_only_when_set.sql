-- Your own stories have no outside source link (source_url = ''), so the duplicate guard only applies to real links.
drop index if exists public.articles_source_url_uidx;
create unique index articles_source_url_uidx on public.articles (source_url) where source_url is not null and source_url <> '';
