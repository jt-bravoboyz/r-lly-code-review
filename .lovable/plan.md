# Native iOS Build Hardening

Three surgical changes so the codebase behaves correctly inside the Capacitor WKWebView shell we'll ship to Xcode / TestFlight.

## 1. Guard the Service Worker (push notifications)

**File:** `src/hooks/usePushNotifications.tsx`

- Import `Capacitor` from `@capacitor/core`.
- Compute `isNative = Capacitor.isNativePlatform()` once.
- Set `isSupported` to `false` whenever `isNative` is true — this short-circuits every effect that touches `navigator.serviceWorker` / `PushManager`.
- Wrap the `navigator.serviceWorker.register('/sw.js')` call in `registerServiceWorker()` with a `if (isNative) throw new Error('Use Capacitor Push on native')` early return guard.
- Add a `// TODO(native-push):` comment noting that native APNs registration via `@capacitor/push-notifications` will be wired up in a follow-up task (out of scope here — per the audit, that's its own work item).

Result: on iOS the SW never registers, no VAPID fetch fires, and the in-app `Enable Notifications` toggle simply reports unsupported until native push is wired.

## 2. Remove residual PWA install banner + contact-sync warning

**Files to delete (no remaining importers — verified via ripgrep):**
- `src/components/pwa/PWAInstallPrompt.tsx`
- `src/hooks/usePWAInstall.tsx`

(The `PWAInstallPrompt` component is already unmounted from `App.tsx`; we're just removing the dead source so the `beforeinstallprompt` listener can never re-attach if someone re-imports the hook later.)

**Contact-sync warning copy** — `src/components/contacts/AddPeopleSheet.tsx`:
- Delete the "Apple disclaimer" `<p>` block (lines ~248–251): *"Apple limits contact syncing on web apps. Type any name or number above to send an invite link manually."*
- In `handleNativeContacts()`, remove the web-only `toast.info('Apple restricts direct contact access in browsers…')` fallback (lines ~149–152). On native we go through the Capacitor Contacts permission sheet; on web we fall through silently to the Import Options (VCF / Paste / CSV) that are already visible right below.

## 3. Native-safe URL handlers

Add a tiny shared helper so every call site behaves correctly under Capacitor.

**New file:** `src/lib/nativeLinks.ts`

```ts
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// sms:, mailto:, tel: → always same-window navigation (works on web + native)
export function openProtocolLink(url: string) {
  window.location.href = url;
}

// External https/http → Capacitor Browser (in-app Safari) on native,
// new tab on web.
export async function openExternalLink(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
```

**Install dependency:** `@capacitor/browser` (matched to Capacitor 8).

**Refactor these call sites to use the helpers:**

| File | Current call | Replacement |
|---|---|---|
| `src/hooks/usePhoneInvites.tsx` (`openSMSInvite`) | `window.open(smsUrl, '_blank')` | `openProtocolLink(smsUrl)` |
| `src/components/squads/ContactsTab.tsx` (SMS button ~L120) | `window.open(\`sms:…\`, '_blank')` | `openProtocolLink(\`sms:…\`)` |
| `src/components/squads/ContactsTab.tsx` (mailto ~L581) | `window.open(\`mailto:…\`, '_blank')` | `openProtocolLink(\`mailto:…\`)` |
| `src/components/squads/SquadInviteDialog.tsx` (mailto ~L110) | `window.open(\`mailto:…\`, '_blank')` | `openProtocolLink(...)` |
| `src/components/squads/SquadInviteDialog.tsx` (sms ~L120) | `window.open(smsUrl, '_blank')` | `openProtocolLink(smsUrl)` |
| `src/components/rides/RideshareDrawer.tsx` (~L62) | `window.open(url, '_blank', 'noopener,noreferrer')` | `await openExternalLink(url)` (https Uber/Apple Maps/Google Maps fallback; the existing `window.location.href = url` branch for mobile UA already covers `lyft://` deep links) |

Other `window.open` sites flagged in the audit (`mapStyles.ts`, `LiveTracking.tsx`, `TurnByTurnNav.tsx`) are all external `https:` map links and will also be migrated to `openExternalLink` in the same pass for consistency.

## Out of scope (separate tickets)

- Swapping web push (VAPID) for `@capacitor/push-notifications` (APNs).
- Replacing `useOfflineQueue` Background Sync with an in-app retry queue.
- Installing `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`.
- Viewport meta cleanup (`maximum-scale=1`).

These were called out in the earlier audit and will be addressed in follow-up passes so this PR stays focused and reviewable.
