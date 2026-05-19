## What's broken

You shared `…/share-preview?to=…&type=event&id=…`. iMessage scraped it but only got plain text. Two real bugs in the freshly-deployed flyer pipeline:

### Bug A — `share-preview` only emits OG tags when it recognises the bot
`BOT_REGEX` checks for `iMessage`, `Applebot`, etc. The actual iMessage Link Preview crawler sends a generic Safari User-Agent (no "iMessage" string), so the function 302-redirects to the SPA. The SPA's `index.html` has no per-event `og:*` tags, so iMessage falls back to plain text.

### Bug B — `render-event-og-image` is throwing and always 302-ing to the fallback
Edge logs show every call dies with:
```
Error: Playfair font URL not found
  at getPlayfair (…/render-event-og-image/index.ts:29:19)
```
The Google Fonts CSS endpoint returns `.ttf` when called with `User-Agent: Mozilla/5.0` (the regex only looks for `.woff2`). So the font URL parse returns null → exception → catch block redirects to `og-fallback.png`. Even when iMessage *does* fetch our `og:image`, it just gets the static fallback.

## Fix

Two surgical edits, no new files.

### 1. `supabase/functions/share-preview/index.ts`
Drop the User-Agent sniffing entirely and always return the HTML doc with full `og:*` + `twitter:*` tags plus a `<meta http-equiv="refresh">` and a `<script>` redirect for humans. This is what Partiful / Eventbrite do, and removes the bot-UA guessing game.

```text
- if (!isBot) return Response.redirect(to, 302);
+ // Always return HTML with OG tags. Humans are bounced via meta-refresh + JS.
```
Add `<script>location.replace(${JSON.stringify(to)})</script>` in `<body>` so humans navigate instantly while crawlers (which don't run JS) still see the meta tags.

### 2. `supabase/functions/render-event-og-image/index.ts`
Make font loading robust:

- Request Google Fonts CSS with a Chrome User-Agent (`Mozilla/5.0 … Chrome/120…`) so it returns `.woff2`.
- Widen the regex to also accept `.woff` and `.ttf`.
- If the font fetch still fails, render WITHOUT a custom font (Satori falls back to a built-in sans-serif) instead of throwing — a slightly less branded PNG is far better than the fallback graphic every time.

```text
const css = await fetch(GFONTS_URL, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
}).then(r => r.text());
const url = css.match(/url\((https:\/\/[^)]+\.(?:woff2|woff|ttf))\)/)?.[1];
```

Wrap `getPlayfair()` in try/catch inside `buildPng` so a font outage degrades gracefully.

### 3. Invalidate the broken cache row
The first successful call for this event already wrote a `flyer_og_url` pointing at the fallback PNG (because the render exception was caught after the cache row was written? — actually it isn't, but to be safe).
Run once via Supabase:
```sql
UPDATE public.events SET flyer_og_url = NULL, flyer_og_generated_at = NULL WHERE flyer_og_url IS NOT NULL;
UPDATE public.split_check_requests SET flyer_og_url = NULL, flyer_og_generated_at = NULL WHERE flyer_og_url IS NOT NULL;
```

## Files changed
- `supabase/functions/share-preview/index.ts`
- `supabase/functions/render-event-og-image/index.ts`
- One-off `UPDATE` via migration tool to clear stale cache columns.

## Verification
1. `curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605" https://…/share-preview?…` returns 200 HTML containing `<meta property="og:image"`.
2. `curl -I https://…/render-event-og-image?id=…` returns 302 to a freshly uploaded `event_flyers/event/<id>/<hash>.png` (NOT to `og-fallback.png`).
3. Re-share the link in iMessage → preview card shows the themed flyer with the event title.
