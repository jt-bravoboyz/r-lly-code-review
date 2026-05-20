Yes — we can move the Cloudflare Worker setup into GitHub so the Worker script, routes, and verification are managed as code instead of relying on the Cloudflare UI.

Important limitation: GitHub can deploy the Worker and its routes, but it cannot bypass Cloudflare account permissions. You’ll still need to add Cloudflare credentials once as GitHub repository secrets.

Plan:

1. Add Cloudflare Worker source to the repo
   - Create a dedicated Worker entry file for `rlly-share-unfurl`.
   - The Worker will detect bot user agents on `rlly.cloud/join/*` and `rlly.cloud/events/*`.
   - Bot requests will proxy to the existing `share-preview` backend function.
   - Human/browser requests will pass through to the normal R@lly app.

2. Add Wrangler configuration
   - Add `wrangler.toml` with:
     - Worker name: `rlly-share-unfurl`
     - Route: `rlly.cloud/join/*`
     - Route: `rlly.cloud/events/*`
     - Compatibility date
   - This is the part that should make Cloudflare routes reproducible from GitHub instead of manually configured in the dashboard.

3. Add npm scripts
   - Add scripts like:
     - `worker:deploy` to deploy via Wrangler
     - `worker:tail` for logs if needed
     - keep `test:unfurl` as the verification command

4. Add GitHub Actions workflow
   - Create `.github/workflows/deploy-cloudflare-worker.yml`.
   - On push to the main branch, deploy the Worker using Cloudflare’s official Wrangler action.
   - After deploy, run `npm run test:unfurl` so the workflow fails if Facebook/Slack/Twitter still receive generic app-shell OG tags.

5. Document required GitHub secrets
   - Add setup notes for these repo secrets:
     - `CLOUDFLARE_API_TOKEN`
     - `CLOUDFLARE_ACCOUNT_ID`
   - The API token needs permission to edit Workers and routes for the `rlly.cloud` zone.

6. Verify locally after implementation
   - Run the unfurl script again after the configuration is in place.
   - Confirm Facebook, Slack, Twitter, and a human UA return the expected split behavior:
     - bots: event-specific premium flyer OG metadata
     - humans: normal app page

Technical details:

```text
GitHub push
  -> GitHub Action
  -> Wrangler deploy
  -> Cloudflare Worker + routes
  -> npm run test:unfurl
  -> verify rlly.cloud/join/* and rlly.cloud/events/*
```

What you’ll need to do after I implement it:

1. Connect this Lovable project to GitHub if it is not already connected.
2. Add the two Cloudflare secrets in the GitHub repo settings.
3. Push/sync the changes so the GitHub Action can deploy the Worker.