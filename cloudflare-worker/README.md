# rlly-share-unfurl (Cloudflare Worker)

Cloudflare Worker that intercepts social-bot requests to:

- `rlly.cloud/join/*`
- `rlly.cloud/events/*`

Bots are served full Open Graph / Twitter Card HTML produced by the
Supabase `share-preview` edge function (which in turn embeds the themed
flyer image rendered by `render-event-og-image`). Humans pass through
to the normal R@lly SPA.

## Deploy from GitHub (recommended)

The workflow at `.github/workflows/deploy-cloudflare-worker.yml`
deploys this Worker on every push to `main` that touches
`cloudflare-worker/**`. It requires two repo secrets:

| Secret                  | Where to get it                                            |
| ----------------------- | ---------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare dashboard → My Profile → API Tokens → Create    |
|                         | Token. Permissions needed:                                 |
|                         | • Account → Workers Scripts → Edit                         |
|                         | • Zone → Workers Routes → Edit (rlly.cloud)                |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar of any zone overview. |

After deploy, the workflow runs `npm run test:unfurl` against
`rlly.cloud` to confirm Facebook / Slack / Twitter / etc. now receive
event-specific OG metadata.

## Deploy locally

```bash
cd cloudflare-worker
npx wrangler deploy
```

You will be prompted to authenticate with `wrangler login` the first time.
