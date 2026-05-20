## Findings

The unfurl system is still not working correctly in production.

- `https://rlly-share-unfurl.rally-app.workers.dev/join/F5FF4F` still returns `Hello World!` as `text/plain`, so that Worker hostname is not running the intended unfurl script.
- `https://rlly.cloud/join/F5FF4F` returns the normal R@lly app shell for Facebook and Slack crawlers, with the generic OG image `/rally-icon-192.png`. That means the `rlly.cloud/*` Worker route is not intercepting this request, or it is failing open to the origin.
- The direct preview renderer does work when called with the expected query-string shape:
  - `to=https://rlly.cloud/join/F5FF4F`
  - `type=event`
  - `id=7ac9026b-ed40-44f9-b8d5-95cd5c0c1b86`
- The direct preview response returns the correct event metadata:
  - `og:title`: `Thank You LBT Volunteers — R@lly`
  - `og:description`: `Celebrating all the amazing volunteers of Long Bay Theatre`
  - `og:image`: the generated event flyer image

## Root cause

There are two likely Cloudflare-side issues:

1. The Worker deployed at `rlly-share-unfurl.rally-app.workers.dev` is still the default script, not the R@lly unfurl Worker.
2. The Worker route for `rlly.cloud/*` is either not attached to the right Worker, not matching `/join/*`, or the Worker code is forwarding `/join/F5FF4F` directly to the preview function. The current backend preview function does not accept `/join/F5FF4F`; it expects query parameters.

## Fix plan

Update the Cloudflare Worker so bot requests to public R@lly URLs are rewritten into the preview function’s expected query format.

### 1. Worker route behavior

For human browsers:

```text
https://rlly.cloud/join/F5FF4F -> pass through to the R@lly app
```

For bots/crawlers:

```text
https://rlly.cloud/join/F5FF4F
  -> Worker detects bot User-Agent
  -> Worker extracts invite code F5FF4F
  -> Worker resolves the matching event id
  -> Worker fetches:
     /share-preview?to=https://rlly.cloud/join/F5FF4F&type=event&id=<event_id>
  -> Worker returns that HTML as text/html
```

### 2. Code changes needed in Cloudflare

The Worker should either:

- resolve invite codes by querying the public event lookup endpoint/RPC if one exists, or
- call a small Lovable Cloud backend function that accepts `/join/:code` and returns the proper preview HTML.

The cleanest durable app-side improvement is to update `share-preview` itself so it can accept `code=F5FF4F`, look up the event id server-side, and render the preview. Then the Worker only needs to rewrite:

```text
/join/F5FF4F
-> /share-preview?to=https://rlly.cloud/join/F5FF4F&type=event&code=F5FF4F
```

### 3. Validation after Cloudflare update

Run these checks:

```bash
curl -A "facebookexternalhit/1.1" https://rlly.cloud/join/F5FF4F
curl -A "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)" https://rlly.cloud/join/F5FF4F
curl -A "Mozilla/5.0" https://rlly.cloud/join/F5FF4F
```

Expected result:

- Facebook/Slack requests return `content-type: text/html; charset=utf-8`
- Facebook/Slack requests include event-specific `og:title`, `og:description`, and `og:image`
- Human browser requests still load the normal R@lly app

## Recommended next implementation

I should update the `share-preview` backend function to support `code=<invite_code>` directly, then provide the exact Cloudflare Worker script that maps `/join/:code` bot traffic to that endpoint. This avoids needing Cloudflare to know database details and keeps the sensitive lookup in Lovable Cloud.