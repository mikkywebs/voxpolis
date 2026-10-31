-- Flexible story structure + multi-source stories (additive).
alter table public.articles
  add column if not exists story_type text,      -- clash | policy | court | appointment | allegation | results | breaking | diplomacy | development
  add column if not exists lead text,            -- opening paragraphs, no heading
  add column if not exists sections jsonb,       -- [{ "heading": "...", "kind": "report|response|context|analysis|reaction|numbers", "paragraphs": ["..."] }]
  add column if not exists what_to_watch text,
  add column if not exists sources jsonb;        -- [{ "name": "Punch", "url": "https://..." }]
