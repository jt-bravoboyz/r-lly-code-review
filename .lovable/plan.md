## Findings

The image metadata is present and the PNG is valid, but the share-preview edge-function URL is being served with:

```text
Content-Type: text/plain
Content-Security-Policy: default-src 'none'; sandbox
X-Content-Type-Options: nosniff
```

That combination makes iMessage treat the response like a text document even though the body contains valid HTML meta tags. The function code is already setting `text/html`, so this appears to be enforced by the edge gateway for direct `functions.supabase.co` HTML responses.

## Plan

1. Route shared event links through the public app domain
   - Change generated share links from the raw edge-function domain to a clean `https://rlly.cloud/share-preview?...` URL.
   - Keep the same query params: `to`, `type`, `id`, and optional referrer.

2. Add a Vite/dev-server rewrite for local preview
   - Proxy `/share-preview` to the existing backend function during development so checks work in Lovable preview.
   - This avoids exposing the raw function URL as the user-facing share link.

3. Add a production hosting rewrite
   - Add a deployment rewrite so `https://rlly.cloud/share-preview` forwards to the existing share-preview backend function.
   - The browser/iMessage-facing URL will now be on `rlly.cloud`, which serves HTML as HTML instead of a text document.

4. Expand the automated check
   - Update `scripts/check-share-preview.mjs` to check both:
     - `Content-Type` contains `text/html`
     - `og:image` and `twitter:image` exist and resolve to an image
   - Default the check to the new `https://rlly.cloud/share-preview?...` URL.

5. Validate
   - Fetch the new public-domain share URL with iMessage-like and crawler-like user agents.
   - Confirm `Content-Type: text/html`, meta tags are present, and the image URL resolves as `image/png`.

## Technical notes

- The edge function itself can stay as the metadata renderer.
- The key fix is not publishing the frontend alone; it is ensuring the link sent to iMessage is on `rlly.cloud` instead of the raw edge-function host.
- Existing old links on the raw function host may still render as text documents because that host is still returning `text/plain`.