## R@lly iOS pre-launch fix pack

Six fixes — all presentation/integration layer, no schema changes.

### 1. Remove "Install R@lly" home-screen popup
Inside a native iOS build the PWA install banner is meaningless. Remove it.

- Find the `<PWAInstallPrompt />` mount (likely `Index.tsx` / `AppEntry.tsx`) and delete the import + render.
- Optionally guard the component so it never renders inside Capacitor: `if (Capacitor.isNativePlatform()) return null;` — belt and suspenders.

### 2. Bottom nav covering content
Today `BottomNav` floats (`fixed bottom-4 left-4 right-4 rounded-2xl`, `h-16`) and pages use ad-hoc `pb-28`. Content still gets clipped on several screens.

Fix:
- Dock it flush: change to `bottom-0 left-0 right-0 rounded-none border-t border-border/60`, keep the safe-area-inset-bottom padding so the iPhone home indicator is respected.
- Add a single `pb-bottom-nav` utility in `index.css` resolving to `calc(4rem + env(safe-area-inset-bottom) + 1rem)`.
- Replace ad-hoc `pb-24` / `pb-28` on main scroll containers (`Index`, `Events`, `Notifications`, `Squads`, `Profile`, `Achievements`, `SplitCheckHome`, `EventDetail`) with `pb-bottom-nav`.

Predictable, no auto-hide jank, matches native iOS tab-bar behavior.

### 3. Past R@llies archive
No dedicated "all past R@llies" view today.

- New route `/rallies/past` → new page `src/pages/PastRallies.tsx`.
- Reuses `useMyEvents`; filters status `completed` or `ended`, sorted newest first.
- Row: title, date, location, attendee count, tap → `/events/:id` (already shows recap/gallery for past events).
- Entry points: "See all" link in the Home Past section header + a "View past R@llies" link on the Profile screen under the stats row.
- Empty state: "No R@llies in the books yet. Your story starts at the next one."

### 4. Invite previews showing raw code instead of the flyer image
Shared invite links are rendering as a code blob in iMessage/WhatsApp/etc instead of the themed flyer image. Two known causes to fix:

- **Crawler routing**: confirm every share link is built via `buildRallyShareUrl` / `buildTabShareUrl` (memory: Themed Flyer Engine). Audit `usePhoneInvites`, `ContactInviteDialog`, `SquadInviteDialog`, `PaySplitShareDialog`, recap share buttons. Any place still hand-building a URL gets swapped.
- **OG headers on the share-preview function**: re-check `supabase/functions/share-preview/index.ts` returns proper `Content-Type: text/html`, `og:image` absolute URL (must be `https://rlly.cloud/...`), `og:image:width/height`, `twitter:card = summary_large_image`, and a 200 (not 302) when the user-agent is a crawler (facebookexternalhint, WhatsApp, Twitterbot, iMessagebot, Slackbot, LinkedInBot, Discordbot). If the function is currently 302-redirecting crawlers to the app, that's why iMessage shows the code blob — fix by serving the OG HTML inline.
- **Render check**: run `scripts/check-share-preview.mjs` against a sample event + tab URL after the fix to confirm `og:image` resolves and `render-event-og-image` returns a real PNG.

### 5. Share links must use rlly.cloud (no `*.lovable.app` / `*.lovableproject.com`)
Memory already says this, but links are leaking the long Lovable preview host.

- Audit `src/lib/appUrl.ts` / `src/lib/shareUrls.ts` — `PUBLIC_APP_URL` must always resolve to `https://rlly.cloud` for any share/invite/recap/tab URL, regardless of `window.location.origin`. Don't fall back to `window.location.origin` for share-bound URLs.
- Sweep for hard-coded preview hosts: `rg -n 'lovableproject\.com|lovable\.app|id-preview'` and replace any share-link construction with the helpers.
- SMS invite copy (`usePhoneInvites`, `invite-sms-delivery-logic`) must use `rlly.cloud` deep-link only.

### 6. Native contacts + native SMS for invites (App Store-ready)
Today's invite flow uses web Contact Picker / paste / CSV. For the iOS build we want true native pickers.

- Install `@capacitor-community/contacts` and `@capacitor/share` (already may be partial). Add Info.plist usage strings via `scripts/ios-setup.sh`:
  - `NSContactsUsageDescription`: "R@lly uses your contacts so you can invite friends to your R@llies."
- Extend `usePhoneContacts` with a Capacitor branch:
  - If `Capacitor.isNativePlatform()`, request `Contacts.requestPermissions()`, then `Contacts.getContacts({ projection: { name: true, phones: true, emails: true } })`.
  - Else fall back to existing web behavior (`navigator.contacts` / paste / CSV).
- Add a "Invite via Text" path in `ContactInviteDialog`:
  - Native: open the iOS Messages composer pre-filled with the R@lly Remix template (memory: Invite UX and Voice). Use `sms:` URL scheme — `sms:&body=...` on iOS — wrapped in an anchor tap (works inside WKWebView). For batched recipients, `sms:/open?addresses=+1...,+1...&body=...` (iOS supports `?` not `&` as the first separator — memory: Invite SMS Delivery Logic already encodes this correctly; reuse that helper).
  - Web fallback: existing share-sheet / `navigator.share` path stays.
- Permission denied: show a soft dialog explaining how to enable contacts access in Settings, with a "Try paste instead" CTA.
- Privacy: contacts are read in-memory only, never persisted to the DB unless the user explicitly taps "R@lly" on a name (existing behavior).

### Technical notes / order of work
1. (5) `appUrl.ts` + share helpers — single source of truth for `rlly.cloud`.
2. (4) Share-preview function + invite call sites — confirms the flyer image renders.
3. (1) Remove PWA banner.
4. (2) Dock the bottom nav + standardize padding.
5. (3) Past R@llies page + entry points.
6. (6) Capacitor Contacts plugin + native SMS path + Info.plist strings.

After all changes: `npm run build && npx cap sync ios`, then reopen Xcode.

Nothing in this plan touches DB schema, RLS, or auth — all presentation / integration layer.
