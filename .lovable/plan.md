## Native iOS Readiness — Remaining Adjustments

After last pass, most device APIs are guarded. Here is what is **still web-shaped** and what to change. Everything below preserves the live web build via `Capacitor.isNativePlatform()` guards.

---

### 🔴 Will misbehave inside WKWebView

**1. `usePushNotifications.tsx` still touches web push paths on native**
Even though `isSupported` should be false on native, lines 85, 96, 156, 202 still reference `navigator.serviceWorker.ready` / `register('/sw.js')`. Need an explicit early-return on `Capacitor.isNativePlatform()` at the top of `subscribe()`, `registerServiceWorker()`, and `unsubscribe()` so a stray call from a future component can't trigger the web flow on iOS.

**2. `useNativeGeolocation.tsx` falls back to `navigator.geolocation` inside the *native* hook**
Lines 193, 332, 397, 429 use the browser API as a fallback. That's fine on web, but the branches need a `!Capacitor.isNativePlatform()` guard so a Capacitor plugin failure can't accidentally fall through to the WKWebView geolocation prompt (which uses the wrong NSLocationUsageDescription string).

**3. `useOfflineQueue.tsx` — Background Sync still referenced**
Lines 74 and 122 read `'sync' in navigator.serviceWorker`. Line 122 already has `!isNative()` but line 74 does not. Wrap both.

**4. `paymentQueue.ts` + `PaySplitShareDialog.tsx` rely on `navigator.onLine`**
`navigator.onLine` is unreliable in WKWebView (often stuck on `true` after airplane mode toggles). Switch the native path to `@capacitor/network`'s `Network.getStatus()` / `addListener('networkStatusChange')`. Web path keeps `navigator.onLine`.

**5. `ConnectionStatusBanner.tsx`** — same `navigator.onLine` issue. Subscribe to `Network` plugin on native.

---

### 🟠 Capacitor plugin config missing

**6. `capacitor.config.ts` declares no plugin options.** Recommend adding:
```ts
plugins: {
  SplashScreen: { launchAutoHide: false, backgroundColor: '#0F172A' },
  StatusBar: { style: 'DARK', overlaysWebView: true },
  Keyboard: { resize: 'native', resizeOnFullScreen: true },
  PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
}
```
Without these, the iOS splash flashes white before `NativeBootstrap` hides it, the status bar bg won't match the dark theme, and incoming push notifications show no banner while app is foregrounded.

**7. Universal Links entitlement reminder (no code change)**
`nativeBootstrap` already routes `rlly.cloud/join/:code` via `appUrlOpen`. For iOS to *receive* those events instead of bouncing to Safari, the Xcode project needs the Associated Domains entitlement (`applinks:rlly.cloud`) + the AASA file at `https://rlly.cloud/.well-known/apple-app-site-association`. Will flag this in the README, no code edit needed.

---

### 🟡 Polish (nice-to-have, non-blocking)

**8. `index.html` viewport** — already cleaned of `maximum-scale=1`. ✅
**9. Service worker file `public/sw.js`** — keep shipping it for the web PWA, but verify the kill-switch behavior so it never registers when `navigator.userAgent` matches `Capacitor/iOS`. Currently safe (only `usePushNotifications` registers it, and that hook is guarded), but a one-line guard inside `sw.js`'s `install` is cheap insurance.
**10. `localStorage` is fine in WKWebView** but is wiped if the user clears app storage from iOS Settings → R@lly. The auth-related keys (founding member slot, dismissed invite IDs, join codes) should be mirrored to `@capacitor/preferences` on native for durability. Optional — flag only.

---

### Files to change

```
src/hooks/usePushNotifications.tsx     — add native short-circuits
src/hooks/useNativeGeolocation.tsx     — guard web fallback branches
src/hooks/useOfflineQueue.tsx          — guard line 74 sync check
src/lib/paymentQueue.ts                — Network plugin on native
src/components/payments/PaySplitShareDialog.tsx — Network plugin on native
src/components/layout/ConnectionStatusBanner.tsx — Network plugin on native
capacitor.config.ts                    — add plugins{} block
public/sw.js                           — Capacitor UA early return (1 line)
```

No web-build behavior changes. All edits are inside `if (Capacitor.isNativePlatform())` branches or additive plugin config.

---

### Suggested execution order

1. Capacitor config (#6) — instant polish, zero risk
2. Push + geo + offline guards (#1, #2, #3) — close the last WKWebView leaks
3. Network plugin migration (#4, #5) — single helper, three call-sites
4. SW + preferences polish (#9, #10) — last mile

Approve and I'll execute in that order in a single pass.
