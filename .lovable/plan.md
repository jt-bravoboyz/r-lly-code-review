## Plan

Fix the R@lly share-preview pipeline so pasted event links produce a real rich preview instead of a text-document-style card.

### What I’ll change

1. **Serve crawler HTML with the right content type**
   - Update `supabase/functions/share-preview/index.ts` so every response explicitly includes browser/crawler-safe headers:
     - `Content-Type: text/html; charset=utf-8`
     - remove/avoid `nosniff`/sandbox-style behavior that makes the function look like a text document in some preview clients
   - Keep the full `og:*` and `twitter:*` tags.
   - Keep the human redirect to `https://rlly.cloud/join/F5FF4F`, but make crawler parsing the priority.

2. **Use a direct PNG image URL in `og:image`**
   - Change `share-preview` so it resolves/generates the flyer image URL first, then places the final stored PNG URL in `<meta property="og:image">`.
   - Avoid pointing social apps at a second redirecting function for the image, because iMessage and some clients are fragile with chained redirects.

3. **Fix OG image generation failure**
   - Update `supabase/functions/render-event-og-image/index.ts` to stop using unsupported WOFF2 fonts in Satori.
   - Prefer a known Satori-compatible WOFF/TTF source or fall back cleanly to a bundled/system-safe font path.
   - Ensure the generated file is uploaded as `image/png`, not the current fallback JPEG.

4. **Make the renderer callable by both GET and internal POST**
   - Keep existing GET support for direct image generation.
   - Add a small JSON response mode for internal use by `share-preview`, so `share-preview` can obtain the final PNG URL before building meta tags.

5. **Clear the bad cached flyer URL for this event**
   - Clear stale `flyer_og_url`/`flyer_og_generated_at` for the affected event and any affected tab rows so the next share regenerates with the corrected renderer.

6. **Verify the exact URL you pasted**
   - Confirm the share URL returns `200` HTML with `Content-Type: text/html`.
   - Confirm the HTML contains a final stored `og:image` PNG URL.
   - Confirm that PNG URL returns `200 image/png` without redirecting to `_system/og-fallback.png`.

### Technical notes

- Root cause confirmed: the deployed `share-preview` response body is HTML, but the edge gateway is exposing it as `Content-Type: text/plain` in the function test path, which makes messaging apps treat it like a text document.
- Second confirmed issue: `render-event-og-image` is still failing with `Unsupported OpenType signature wOF2`, so it redirects to the fallback image instead of generating the themed flyer.
- No app UI changes are needed; this is isolated to the two share/OG backend functions plus one cache cleanup.