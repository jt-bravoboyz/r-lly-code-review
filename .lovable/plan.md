## Cleanup plan: remove Cloudflare Worker scaffolding

### What gets deleted
- `cloudflare-worker/` directory (entire folder: `src/index.ts`, `wrangler.toml`, `README.md`, any package files)
- `.github/workflows/deploy-cloudflare-worker.yml`
- `scripts/test-worker-unfurl.mjs` (only used by the deleted workflow)

### What stays untouched
- `supabase/functions/share-preview/` — the themed flyer renderer still works directly via the Supabase function URL
- `src/lib/shareUrls.ts` and all `rlly.cloud` share link generation
- `scripts/check-share-preview.mjs` — still useful for sanity-checking the share-preview function itself

### Impact
- Social unfurls on `rlly.cloud/join/*` and `rlly.cloud/events/*` will go back to whatever the SPA serves (generic app-shell OG tags), since no Worker will be intercepting bot UAs.
- No GitHub Actions runs for Worker deploys.
- If you later want premium unfurls again, the share-preview Edge Function is still in place — we'd only need to re-add a Worker (or equivalent edge interceptor) to route bots to it.

### After cleanup
Refocus on the core app — let me know which area you want to push on next (event detail dynamic themes, R@lly tab, safety flows, etc.).
