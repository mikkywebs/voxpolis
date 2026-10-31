-- Daily limits per desk + pre-publish checks + stale-draft expiry.
alter table public.ingest_log add column if not exists desk text;
create index if not exists ingest_log_desk_day_idx on public.ingest_log (desk, outcome, created_at desc);
alter table public.articles add column if not exists source_facts jsonb; -- numbers + names found in the original reports

-- Unreviewed drafts go stale: discard after 48 hours (reopen from the Discarded tab).
select cron.schedule('voxpolis-expire-drafts', '12 * * * *',
  $$update public.articles set review_status = 'rejected', updated_at = now()
    where review_status = 'pending' and created_at < now() - interval '48 hours'$$);
