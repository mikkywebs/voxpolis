-- See applied migration "verify_polls_origin": fidelity + origin columns, expiry only for desk drafts,
-- voxpolis-verify cron (every 10 min → /api/verify), members-only poll votes with recount function.
alter table public.articles add column if not exists fidelity jsonb;
alter table public.articles add column if not exists origin text not null default 'desk';
create unique index if not exists poll_votes_one_per_member on public.poll_votes (poll_id, user_id);
