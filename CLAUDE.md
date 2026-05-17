# domains.today / Internet Airport

## What lives here vs. where the frontend is

**This repo** (`rodinrooh/domains.today`) owns:
- `scripts/` — Python scraper that fetches and scores new domains
- `.github/workflows/` — scheduled GitHub Actions (fetch daily at 6 PM, reveal loop)
- `supabase/` — database migrations and schema
- The Next.js app in `app/` is **legacy** — it is no longer deployed

**The live frontend** lives in a separate repo: `rodinrooh/rodinrooh`
- URL: `rodinrooh.com/internet-airport`
- Source: `app/internet-airport/page.tsx` in that repo
- Supabase client: `lib/supabase-airport.ts` (uses `NEXT_PUBLIC_AIRPORT_SUPABASE_URL` / `NEXT_PUBLIC_AIRPORT_SUPABASE_ANON_KEY`)

## How to update the frontend (internet-airport UI)

1. Edit files in `/Users/rodin/Desktop/side projects/rodinrooh/app/internet-airport/`
2. `git push` from the `rodinrooh` repo — Vercel auto-deploys on push to main
3. Vercel project name: `rodinrooh` (under rodins-projects-97c1647b)
4. Live at: `rodinrooh.com/internet-airport`

## How to update the scraper / backend

- Edit `scripts/` Python files in **this** repo (`domains.today`)
- Push to main — GitHub Actions picks up the change automatically
- Secrets needed in GitHub: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- The scraper writes directly to Supabase; the frontend just reads from it

## Supabase

- The `domains` table is what the frontend reads
- Key columns: `id`, `domain`, `shown` (bool), `shown_at` (timestamp), `score` (0–100)
- Domains are fetched daily, scored, then revealed gradually via the reveal workflow
- RLS: public can only read rows where `shown = true`; service role has full access

## GitHub Actions

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `fetch.yml` | Daily at 6 PM UTC | Runs `fetch_domains.py` then `score_domains.py` |
| `reveal.yml` | Manual / cron-job.org | Runs `reveal_one.py` every ~1s for 45 iterations |

## Deploy checklist (if setting up fresh)

1. Set GitHub Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
2. Run Supabase migrations in `supabase/migrations/` in order
3. Frontend env vars go in the `rodinrooh` Vercel project, not here
