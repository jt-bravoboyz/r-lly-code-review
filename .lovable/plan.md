## Goal

Gate three things behind a "Coming Soon" treatment (same vibe as the existing R@lly Feed `RallyFeedComingSoon` glass module) while leaving the rest of the app fully functional:

1. **R@lly Tabs** (`/tabs` route → `SplitCheckHome`)
2. **Payment Method** card on the Profile page (`PaymentMethodSection`)
3. **Payouts** card on the Profile page (`PayoutSettingsSection`)

Then run a focused functional audit of every other major surface and report back what's healthy vs. anything that needs follow-up.

---

## Part 1 — Coming Soon gating

### 1a. Reusable "Coming Soon" primitives
Refactor the look/feel from `RallyFeedComingSoon.tsx` so we don't duplicate animation/CSS three times:

- New `src/components/common/ComingSoonModule.tsx` — a compact, themed glass card variant (tag, headline with R@lly orange `@`, subhead, divider, blinking "Stand By / Launching Soon" status). Accepts `tag`, `title`, `subtitle`, and an optional `className` so it can sit inline inside the Profile page (smaller padding) or as a full-screen overlay (R@lly Tabs).
- New `src/components/common/ComingSoonScreen.tsx` — full-screen wrapper that mirrors the current R@lly Feed look (scrolling blurred mock cards, ambient orbs, top/bottom fades) and renders `ComingSoonModule` centered. Takes the headline/tag/subtitle props plus an optional `mockCards` array (defaults to a tabs-flavored set for `/tabs`, beach/feed flavored for events).
- Refactor `RallyFeedComingSoon.tsx` to use `ComingSoonScreen` so we keep one source of truth. Existing public API stays the same.

### 1b. R@lly Tabs → full-screen coming soon
- Replace the body of `src/pages/SplitCheckHome.tsx` so the page renders `ComingSoonScreen` (tag: "Classified — Tier 03", title: "R@LLY TABS", subtitle: "Split the check. Settle the night.") plus the existing `BottomNav`.
- Keep the existing tabs business logic out of the bundle by simply not rendering it. Don't delete `useSplitCheck`, `StartTabDialog`, or the underlying hooks/DB — we want to flip this back on later. Same approach the R@lly Feed gate uses for the events page.
- Leave the `/tab/pay/:requestId` guest-pay route alone — guests with an outstanding tab link must still be able to pay; only the in-app Tabs hub is gated.

### 1c. Payment Method + Payouts → inline coming soon cards
- Replace the bodies of `PaymentMethodSection.tsx` and `PayoutSettingsSection.tsx` with a single `<Card>` wrapper that shows `ComingSoonModule` inline. Headers stay ("Payment Method", "Payouts") so the Profile layout doesn't reflow oddly, but all FluidPay calls (`useMerchantAccount`, profile card-token reads/writes) are short-circuited.
- Keep the files in place and keep their imports in `Profile.tsx` unchanged so we can flip them back on by reverting these two files.

### 1d. Bottom-nav Tabs entry
- Leave the Tabs icon in `BottomNav` as-is (the route still resolves; the user just sees the coming-soon screen). Matches how the R@lly tab still appears even though `/events` is gated.

---

## Part 2 — Full app audit

Run these in parallel and report a single pass/fail summary per area. No code changes unless something is clearly broken, in which case I'll surface it first and ask before fixing.

**Database / backend health**
- `cloud_status` snapshot
- `supabase--linter` for new advisories
- Spot-check the latest postgres + auth + edge-function logs for errors in the last ~24h
- Recently used edge functions: `share-preview`, `render-event-og-image`, `send-event-notification`, `send-transactional-email`, `process-email-queue`, `search-places`, `get-mapbox-token`, `auth-email-hook`

**Auth & onboarding**
- `/auth`, `/auth/return`, Apple/Google providers configured
- Invite-link persistence + `request_join_event` RPC still resolving
- Founding member slot allocation still working

**Core flows (smoke read-only)**
- Events: create / list / detail / invite share URLs (`rlly.cloud/join/CODE`)
- Event chat + attendees triggers
- Ride logistics inside an event (DD + passengers + arrival cascade)
- Safety: R@lly Home, auto-arrival geofence, After R@lly opt-in
- Squads: create, join via code, media signed URLs
- Notifications: unread count, swipe-to-dismiss, push VAPID key
- Media: rally photo/video gallery within the 50/5 cap
- Admin dashboard: roles via `has_role`, analytics queries

**Frontend health**
- Browser console + network errors on the current preview session
- Runtime errors snapshot
- Build/typecheck after the gating changes land (handled automatically by the harness)

**Branding / UX guardrails**
- "R@lly" + "@" spelling intact on the new coming-soon screens
- R@lly Orange token only (no peach/amber)
- Montserrat font on the new module
- Safe-area padding + `100dvh` preserved

---

## Technical notes

- `RallyFeedComingSoon` already defines the animations (`rally-breath`, `rally-blink`, `rally-feed-scroll`). Lift those into `ComingSoonScreen` once.
- All copy uses the R@lly tone: "Classified — Tier 0X" / "Stand By" / "Launching Soon".
- No DB migrations, no edge-function changes, no dependency changes — purely frontend gating + a read-only audit.
- Mem rule reminder: glass/liquid UI (`backdrop-blur-xl`), R@lly Orange `hsl(27 91% 53%)`, Montserrat — all preserved.

---

## Deliverables

1. New `ComingSoonScreen` + `ComingSoonModule` components.
2. `RallyFeedComingSoon` refactored to use them (no visual regression).
3. `SplitCheckHome`, `PaymentMethodSection`, `PayoutSettingsSection` swapped to coming-soon presentations.
4. A single audit report in chat covering every area above, with ✅ / ⚠️ / ❌ per item and a short note for anything not green.