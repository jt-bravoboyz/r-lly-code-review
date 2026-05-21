## The problem

When you run `npx cap sync ios` and then open Xcode, the app launches and just shows the Lovable preview website instead of your real native app.

**Root cause:** `capacitor.config.ts` currently injects `server.url = https://...lovableproject.com` whenever `NODE_ENV !== 'production'`. On your Mac, `NODE_ENV` is almost never set to `production` during `npx cap sync`, so that dev server URL gets baked into `ios/App/App/capacitor.config.json`. iOS then loads the Lovable website instead of the local bundled web app.

This is the "live hot-reload from Lovable" behavior — useful for quick prototyping, wrong for a real native app.

## The fix (1 file)

Flip the logic in `capacitor.config.ts` so it defaults to **native/self-contained** and only points at the Lovable sandbox when you explicitly opt in with `CAP_LIVE_RELOAD=1`.

```ts
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const useLovableLiveReload = process.env.CAP_LIVE_RELOAD === '1';

const config: CapacitorConfig = {
  appId: 'app.lovable.30a08aa7cdeb4250a60c0605f836113c',
  appName: 'R@lly',
  webDir: 'dist',
  ...(useLovableLiveReload ? {
    server: {
      androidScheme: 'https',
      url: 'https://30a08aa7-cdeb-4250-a60c-0605f836113c.lovableproject.com?forceHideBadge=true',
      cleartext: true,
    }
  } : {}),
};

export default config;
```

Result:
- `npm run build && npx cap sync ios` → self-contained native app loading your bundled `dist/` files. This is what you want for Xcode / TestFlight / App Store.
- `CAP_LIVE_RELOAD=1 npx cap sync ios` → opt-in live reload from the Lovable sandbox (only if you ever want it).

## What you do on your Mac after I push this

```bash
git pull
npm install
npm run build
npx cap sync ios          # now writes a clean capacitor.config.json (no server.url)
npx cap open ios
```

In Xcode hit ▶︎ Run. The app will boot into your real R@lly UI, not the Lovable website.

If you've already opened the project once and want to be 100% sure there's no leftover dev URL, you can also delete `ios/App/App/capacitor.config.json` before re-running `npx cap sync ios` — `sync` will regenerate it fresh.

## Files changed

- `capacitor.config.ts` — invert the dev-server condition as above.
- `README-MOBILE.md` — update the "Dev vs Production build" section to reflect the new `CAP_LIVE_RELOAD=1` opt-in (instead of the old `NODE_ENV` behavior).

No other code, no native changes, no Supabase changes.
