# Voxpolis Automatic News Pipeline Engine

The **Voxpolis Automatic News Pipeline** is a fully automated, unattended news ingestion, scraping, Anthropic Claude AI rewrite, and publishing system. 

It contains zero human editor intervention, no draft queues, and no manual rewrites. Every single published brief is an original, multi-paragraph brief generated from full scraped source pages with zero verbatim copying or teaser truncation.

---

## 🚀 Environment Variables

Ensure the following environment variables are configured in `.env.local` or your production hosting environment (e.g. Vercel / Netlify / server):

```env
# Required for Automatic AI Brief Rewrites
ANTHROPIC_API_KEY=sk-ant-api03-...

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://cssuftsfbecpennubbge.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Site URL
NEXT_PUBLIC_SITE_URL=https://voxpolis.app
```

---

## ⚡ Pipeline Architecture

```
[1. DISCOVER] -> [2. FETCH & SCRAPE] -> [3. CLASSIFY & REWRITE] -> [4. QUALITY GATES] -> [5. SLUG & STORE]
   (RSS Poll)      (Full HTML Body)      (Anthropic Claude 3.5)      (Word count, [...] check)  (Unique Slug)
```

1. **DISCOVER**: Polls RSS feeds. Upserts on `source_url` so 1 `source_url` = 1 Voxpolis article. Never creates duplicates if multiple feeds share a link.
2. **FETCH**: Performs HTTP GET to `source_url`, extracts clean article text (>800 chars), strips nav/ads/comments. Rejects teasers ending in `[...]` or `read more`.
3. **CLASSIFY & REWRITE**: Passes full text to Anthropic Claude API (`temperature 0.2`) with Voxpolis system prompt.
4. **QUALITY GATES**: Automated validation enforcing:
   - `single_story`: Body markdown >= 220 words.
   - `listicle`: Items length >= 8 if headline/source claims 10.
   - No `[...]` or `…` anywhere in public fields.
   - `executive_summary` != `dek` != first body paragraph.
   - Zero 20+ word verbatim sentence copy from source.
5. **UNIQUE VOXPOLIS URL**:
   `slug = slugify(suggested_slug_keywords || headline).slice(0, 70) + "-" + YYYY-MM-DD + "-" + shortid(hash(source_url))`
   Example: `/article/atiku-tinubu-world-bank-loan-2026-09-29-k4m2`

---

## 🛠 How to Run Any `source_url` Through Production

### Option A: via API Route (Unattended / Cron)

Send an HTTP `POST` request to `/api/pipeline`:

```bash
curl -X POST https://voxpolis.app/api/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "action": "process_url",
    "source_url": "https://www.vanguardngr.com/2026/09/example-news-article/",
    "source_name": "Vanguard Nigeria"
  }'
```

### Option B: via CLI Script

Run the pipeline from terminal:

```bash
# Process a single source URL
npx ts-node --transpile-only scripts/run-pipeline.ts --url "https://dailypost.ng/2026/09/29/example-article/"

# Run backfill job over legacy incomplete rows
npm run backfill
```

---

## 🔄 Backfill Job Details

The backfill job identifies legacy rows where:
- Body text contains `[...]` or `…`
- Body text equals `executive_summary`
- Word count < 150
- Slug ends in `-2` or `-3` cloned suffix

It automatically re-fetches `source_url`, reruns pipeline steps 2–7, generates a unique Voxpolis slug, and registers a `301 Redirect` mapping old legacy URLs to the new permanent slug.
