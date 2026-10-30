# Voxpolis — political news, explained

## How the newsroom works (v2)

1. **Desks** (`src/config/coverage.ts`): 15 country desks + a World desk, each with tested publisher feeds.
2. **Schedule** (`.github/workflows/ingest.yml`): every hour GitHub Actions calls `/api/ingest?desk=XX` for each Tier 1 desk; Tier 2 every 3 hours. Vercel Cron runs the NG desk daily as a backup.
3. **Pipeline** (`src/lib/editorial/`): read feeds → drop old / non-political / already-covered → rank stories carried by several outlets first → read the article → AI writes an original Voxpolis article (headline, summary, key points, story, *What it means*, background, *What happens next*, poll question only when there is a real public choice) → quality gates (politics only, no 8-word copying, minimum length, duplicate check) → save → log to `ingest_log`.
4. **Pages** render on the server (`src/app/page.tsx`, `src/app/[countrySlug]/page.tsx`, `src/app/news/[slug]/page.tsx`) with full SEO metadata and structured data.
5. **SEO files**: `/sitemap.xml`, `/news-sitemap.xml` (last 48h), `/feed.xml`, `/robots.txt`, `/ads.txt` (all generated).

### Environment variables (Vercel → Settings → Environment Variables)

| Name | Needed | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase |
| `NEXT_PUBLIC_SITE_URL` | yes | Your primary domain, e.g. `https://www.voxpolis.app` |
| `CRON_SECRET` | yes | Any long random string; protects `/api/ingest` |
| `GOOGLE_STUDIO_API_KEY` (or `GEMINI_API_KEY`) | yes (or one of the next two) | AI writer (Google AI Studio key) |
| `DEEPSEEK_API_KEY`, `KIMI_API_KEY` | optional | AI fallbacks |
| `GEMINI_MODELS` | optional | Comma list, default `gemini-flash-latest,gemini-flash-lite-latest` |
| `INGEST_MIN_IMPORTANCE` | optional | 1-10, default 4 |
| `GOOGLE_SITE_VERIFICATION` | optional | Search Console meta-tag code |
| `NEXT_PUBLIC_ADSENSE_PUB_ID` | later | `ca-pub-…` — turns AdSense on |
| `NEXT_PUBLIC_MONETAG_SRC`, `NEXT_PUBLIC_MONETAG_ZONE`, `ADS_TXT_EXTRA`, `MONETAG_VERIFICATION` | later | Monetag |

GitHub repository secrets (Settings → Secrets and variables → Actions): `SITE_URL`, `CRON_SECRET`.

### Useful checks
- Why was a story skipped? `select * from ingest_log order by created_at desc limit 50;`
- Are feeds still healthy? The "Build check" workflow runs `scripts/check-sources.ts` on every branch push.

---

## Legacy notes (v1)


**Voxpolis** is a fully automated, unattended multi-country political intelligence web app. It ingests primary source RSS feeds, scrapes full source article HTML, rewrites articles using Anthropic Claude into original briefs, enforces strict quality gates, and serves country-localized political coverage.

Zero human editor intervention. No draft queue. No AI-generated featured images.

---

## 🔑 Environment Variables

Ensure the following environment variables are set in `.env.local` or host settings (Vercel / Netlify / server):

```env
# Anthropic API Key (Claude 3.5 Sonnet Rewrites)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://cssuftsfbecpennubbge.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Site Domain URL & AdSense Publisher ID
NEXT_PUBLIC_SITE_URL=https://voxpolis.app
NEXT_PUBLIC_ADSENSE_PUB_ID=ca-pub-0000000000000000
```

---

## ⚡ Pipeline Architecture (`source_url` → Live Article)

```
[1. DISCOVER] -> [2. FETCH & SCRAPE] -> [3. CLASSIFY & REWRITE] -> [4. QUALITY GATES] -> [5. SLUG & STORE]
   (RSS Poll)      (Full HTML Body)      (Anthropic Claude 3.5)      (Word count, [...] check)  (Unique Slug)
```

1. **DISCOVER**: Polls RSS feeds. Upserts on canonical `source_url`. One `source_url` = one Voxpolis article worldwide. Never creates duplicate `-2`/`-3` clones.
2. **FETCH**: Performs HTTP GET to `source_url`, extracts clean article text (>800 chars), strips nav/ads/comments. Rejects paywalled pages or teasers ending in `[...]` or `read more`.
3. **CLASSIFY & REWRITE**: Passes full extracted text to Anthropic Claude 3.5 (`temperature 0.2`) with exact system prompt & JSON schema. Sets `country_iso`.
4. **QUALITY GATES**:
   - `single_story`: Body markdown >= 220 words.
   - `listicle`: Items length >= 8 if title claims "10 things".
   - No `[...]`, `…`, or `read more` in any public field.
   - `executive_summary` != `dek` != first body paragraph.
   - Zero 20+ word verbatim sentence copy from source.
5. **UNIQUE VOXPOLIS SLUG**:
   `/article/{keywords}-{yyyy-mm-dd}-{shortid(hash(source_url))}`
   Example: `/article/tinubu-fuel-subsidy-2026-09-29-k4m2`

---

## 🌍 Geo-Gating & Guest Paywall

- **Guest Users**: Restricted to localized feeds matching their IP/selected country (`article.country_code == selectedCountry`). Attempting to access cross-country articles returns a **401 Cross-Country Member Access Restricted** screen with `noindex` headers and NO AdSense ads.
- **Logged-In Members**: Full access to all country feeds across all 15+ supported nations.

---

## 🖼 Featured Image Policy

- **Source Image Priority**: Always uses `og:image` or main content image from the original publisher URL. Includes source credit and direct "View Original" link.
- **Site Default Asset**: If source image is missing/invalid, falls back to `/breaking-news-banner.png`.
- **Zero AI Image Generation**: Never calls image models or creates synthetic collages.

---

## 📜 Trust Pages & AdSense Readiness

All 5 core trust pages are fully indexable and accessible via header/footer:
1. `/about` — Platform mission, operator country (Nigeria), supported nations, automated brief methods.
2. `/contact` — Operational contact form, direct email (`contact@voxpolis.app`), physical operator address.
3. `/corrections` — Policy for handling error flags, re-scraping primary sources, and transparent corrections.
4. `/privacy` — GDPR/NDPR compliant privacy policy covering cookie preferences and analytics.
5. `/terms` — Terms of Service for readers and civic sentiment polling.

### Ad Placement & SEO Standards
- **Ad Slots**: 3 distinct slots (`below_dek`, `mid_article` after p2-3, `below_sources`). NO ads near headlines or mimicking "View original" links. NO ads on guest paywall shells or incomplete pages.
- **Robots.txt**: Allows `Mediapartners-Google` crawler and links to dynamic `/sitemap.xml`.
- **Ads.txt**: Published at `/ads.txt` with publisher account details.

---

## 🛠 Running the Pipeline & Backfill CLI

```bash
# Process a single source URL
npx ts-node --transpile-only scripts/run-pipeline.ts --url "https://news-site.com/article"

# Run backfill job to clean legacy incomplete rows
npm run backfill

# Trigger via API Route
curl -X POST https://voxpolis.app/api/pipeline \
  -H "Content-Type: application/json" \
  -d '{"action": "process_url", "source_url": "https://example.com/story"}'
```
