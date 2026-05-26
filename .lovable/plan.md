## What's broken

On native, `executeGoogleSignIn` (and `executeAppleSignIn`) in `src/pages/Auth.tsx` calls:

```ts
lovable.auth.signInWithOAuth('google', { redirect_uri: 'https://rlly.cloud' })
```

Inside the Capacitor WKWebView this does two harmful things:

1. `@lovable.dev/cloud-auth-js` detects we are NOT in an iframe, so it runs `window.location.href = brokerUrl?...`. That navigates the entire native WebView away from the bundled `dist/` app to `oauth.lovable.app`. The user sees a white screen / Safari‑in‑WebView and the app shell is gone.
2. Even if Google completes, the broker redirects to `https://rlly.cloud/...`. Because we have **no Universal Link / `apple-app-site-association`** wired up (Info.plist has no Associated Domains entry) and **no custom URL scheme** registered (no `CFBundleURLTypes` block), the redirect just keeps the WebView on rlly.cloud. The Supabase session is established on the web origin, not in the native app, so the user appears stuck on the auth screen.

Web (`rlly.cloud`, `rallyboyz.lovable.app`) is unaffected — only native is broken.

## Plan

### 1. Detect native and route OAuth through an in‑app browser (frontend)

Edit `src/pages/Auth.tsx` `executeGoogleSignIn` / `executeAppleSignIn`:

- If `Capacitor.isNativePlatform()`:
  - Pass `redirect_uri: 'https://rlly.cloud/auth/return'` (Universal Link target — see step 3) to `lovable.auth.signInWithOAuth`.
  - Wrap the call so the broker URL is opened with `@capacitor/browser` (`Browser.open({ url, presentationStyle: 'popover' })`) instead of `window.location.href`. The simplest path: temporarily set `window.open` to delegate to `Browser.open` for the duration of the call, OR build the broker URL ourselves and open it directly (skip the SDK's `window.location.href` branch).
- If not native: keep current web behavior unchanged.

Add a `src/lib/nativeOAuth.ts` helper that encapsulates this so `Auth.tsx` stays clean and the web bundle tree‑shakes the Capacitor imports.

### 2. Handle the OAuth return inside the native shell (frontend)

Extend the existing `App.addListener('appUrlOpen', …)` in `src/lib/nativeBootstrap.ts`:

- When the incoming URL path is `/auth/return` (or contains `access_token` / `refresh_token` / `code` in the fragment/query), call `Browser.close()` and:
  - Hash flow: parse `access_token` + `refresh_token` from `url.hash`, call `supabase.auth.setSession({ access_token, refresh_token })`.
  - PKCE/code flow: call `supabase.auth.exchangeCodeForSession(url.search)`.
- After session is set, route the user to `/` (or pending join code) via the existing `onDeepLink` callback.

### 3. iOS native config (Universal Links)

- Add an **Associated Domains** entitlement to the iOS target: `applinks:rlly.cloud` (and optionally `applinks:rallyboyz.lovable.app`).
  - File: create `ios/App/App/App.entitlements` and reference it from `project.pbxproj` (`CODE_SIGN_ENTITLEMENTS`).
- Host an `apple-app-site-association` (AASA) JSON at `https://rlly.cloud/.well-known/apple-app-site-association` (served as `application/json`, no extension, no redirects) that grants `com.bravoboyz.rally` paths `/auth/return*` and `/join/*`. We'll place it in `public/.well-known/apple-app-site-association` so Vite serves it and the published `rlly.cloud` picks it up.
- (Android, if/when needed) add an `intent-filter` with `autoVerify="true"` + Digital Asset Links JSON. Out of scope for this fix unless you want Android done in the same pass.

### 4. Verify

- Build → `npx cap sync ios` → run on a real device or simulator with the latest TestFlight build.
- Tap "Continue with Google" → SFSafariViewController opens → Google login → returns to `rlly.cloud/auth/return#access_token=…` → iOS opens the app → `appUrlOpen` fires → session set → user lands on Home.
- Repeat for Apple Sign In (still required by App Store guidelines whenever Google is present).
- Confirm web Google login on `rlly.cloud` and the Lovable preview still works (unchanged code path).

## Technical notes

- We deliberately keep `redirect_uri` pointed at an `https://` URL (Universal Link), not a custom scheme. Lovable's OAuth broker whitelists `rlly.cloud` and lovable.app domains; custom schemes are not accepted by the broker.
- `@capacitor/browser` is already a transitive dep of Capacitor; if missing we'll `bun add @capacitor/browser` and `npx cap sync`.
- Info.plist already has `NSPhotoLibraryUsageDescription` etc.; no new privacy strings needed.
- The AASA file must be reachable over HTTPS with no redirects, content-type `application/json`. Confirm `rlly.cloud` Cloudflare/host doesn't redirect `/.well-known/*`.

## Files to change

- `src/pages/Auth.tsx` — branch OAuth handlers on `Capacitor.isNativePlatform()`.
- `src/lib/nativeOAuth.ts` *(new)* — opens broker URL via `@capacitor/browser`.
- `src/lib/nativeBootstrap.ts` — handle `/auth/return` in `appUrlOpen` and call `supabase.auth.setSession` / `exchangeCodeForSession`, then `Browser.close()`.
- `public/.well-known/apple-app-site-association` *(new)* — AASA payload.
- `ios/App/App/App.entitlements` *(new)* + `ios/App/App.xcodeproj/project.pbxproj` — Associated Domains entitlement `applinks:rlly.cloud`.

## Out of scope (call out if you want it included)

- Android Universal Links / Digital Asset Links.
- Migrating away from the hardcoded `redirect_uri: 'https://rlly.cloud'` on web (works today).
- Any visual changes to the Auth screen.
