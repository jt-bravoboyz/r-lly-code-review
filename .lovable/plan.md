# Add People Premium Redesign + Native Polish Pass

Two parallel tracks: (1) reskin & restructure `AddPeopleSheet` to match R@lly's premium dark glass aesthetic with two split search bars and collapsible sections; (2) finish the remaining items from the native audit behind `Capacitor.isNativePlatform()` guards so the web build stays untouched.

---

## Track 1 — AddPeopleSheet Redesign

File: `src/components/contacts/AddPeopleSheet.tsx` (full rewrite of body, keep hooks/state surface).

### Structure (top → bottom inside the sheet)

```text
┌─ SheetHeader ────────────────────────────────┐
│  "Add People"                                │
│  subtitle: "Pull your crew into the night"   │
├─ Section 1: R@LLY NETWORK ───────────────────┤
│  [🔍  Search friends & R@lly members…]       │   ← Search Bar 1
│  ▸ R@lly Friends (N)            chevron      │   ← Collapsible, closed
│  ▸ Discover on R@lly             chevron     │   ← ContactSmartSearch, closed
│  ── Quick-Add row appears here on no-match ──│
├─ Section 2: YOUR PHONE ──────────────────────┤
│  [📱  Search phone contacts…]                │   ← Search Bar 2
│  [ Sync iPhone Contacts ] (native CTA)       │
│  ▸ From Your Phone (N)          chevron      │   ← Collapsible, closed
│  (web-only Tabs: VCF / Paste / CSV — hidden  │
│   entirely when Capacitor.isNativePlatform)  │
└──────────────────────────────────────────────┘
   sticky bottom action bar (when selections > 0)
```

### Visual language (premium dark)

- Sheet container: `bg-background/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl` with `pt-safe pb-safe` and inner `px-4`.
- Section headers: tiny uppercase Montserrat labels in `text-muted-foreground/70`, with a 1px hairline divider above each.
- Search bars: rounded-2xl, `bg-white/[0.03] border border-white/10`, leading icon in `text-muted-foreground`, focus ring `ring-1 ring-primary/40`.
- Collapsible triggers: full-width pill rows, `h-12 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07]`, chevron rotates 180° on open, count badge right-aligned in `bg-primary/15 text-primary`.
- List rows: `rounded-xl px-3 py-2.5` with avatar circle (40px), name in Montserrat 14/600, secondary in 12/400 muted; selected state ring in `--primary` + faint orange wash.
- Quick-Add: keep the orange accent treatment but upgrade to glass — `bg-primary/12 border border-primary/30 ring-1 ring-primary/20 shadow-[0_4px_24px_-8px_hsl(var(--primary)/0.4)]`.
- All collapsibles use `data-[state=open]:animate-accordion-down` for smooth expand.

### Behavior

- Two independent `useState` queries: `networkQuery`, `phoneQuery`.
- Network section: `filteredFriends` (existing) + `ContactSmartSearch` filtered by `networkQuery`.
- Phone section: `unifiedPhoneContacts` (existing `cloudContacts` merge) filtered by `phoneQuery`.
- Both collapsibles default `open={false}`; auto-open when their respective query has ≥1 char AND yields results.
- Multi-select on phone contacts → sticky bottom CTA "R@lly N Contacts" → batch `openSms` via the unified helper.
- Web-only Tabs block (`VCF / Paste / CSV`) wrapped in `{!Capacitor.isNativePlatform() && …}`.

### Keyboard / safe-area hardening (applied here as the reference pattern)

- `SheetContent` gets `h-[92dvh] pt-safe pb-safe` (replace `h-[85vh]`).
- Both `Input` components get `text-base` (≥16px) plus `style={{ fontSize: '16px' }}` failsafe to suppress iOS auto-zoom.
- Inner scroll container: `max-h-[calc(92dvh-env(safe-area-inset-top)-72px)] overscroll-contain`.
- Sticky action bar: `sticky bottom-0 -mx-4 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-background/90 backdrop-blur-xl border-t border-white/10`.

---

## Track 2 — Native Audit Completion

### 2a. Map links → `openMapsDirections` facade

`openMapsDirections` already exists in `src/lib/nativeLinks.ts`. Sweep all call sites that still hand-build `https://www.google.com/maps/...` or use `openDirections(rawUrl)` and migrate them. Confirmed targets from grep (extend if more surface during edit):

- `src/components/rides/RideshareDrawer.tsx`
- `src/components/rides/RideshareDeepLinkButtons.tsx`
- `src/components/events/AttendeeMap.tsx`
- `src/components/events/LiveTracking.tsx`
- Any remaining occurrences found by `rg "google\.com/maps|maps\.apple\.com" src/` at edit time.

Keep the existing display-only "Apple Maps" vs "Google Maps" label in `RideshareDrawer` (it's a string, not behavior).

### 2b. SMS / mailto unification

- `src/hooks/usePhoneInvites.tsx` line ~135 — replace hand-built `sms:${phone}?body=${msg}` with `openSms(phone, decodedMsg)`.
- `src/components/squads/SquadInviteDialog.tsx` lines 112 & 120-121 — replace with `openMailto` and `openSms`.

### 2c. Router nav + dead branches

- Audit `window.location.href = '/'` etc. in non-protocol contexts (notably `ReturningAuth.tsx`) and swap to `useNavigate()`.
- Remove any `if (true) { … }` dead branches in `AddPeopleSheet.tsx` and `ContactInviteDialog.tsx` (will collapse during the rewrite of AddPeopleSheet; explicit grep + delete in ContactInviteDialog).

### 2d. Safe-area + iOS hardening (global, behind no runtime guard — CSS only)

- Add `safe-top` / `safe-bottom` classes to fixed overlays that currently use bare `fixed inset-0`:
  - `RogueAlertOverlay.tsx`, `RallyCompleteOverlay.tsx`, `RallyHeroMediaCarousel.tsx`, `ImageLightbox.tsx`, `TurnByTurnNav.tsx`, `FindFriendView.tsx`, `RallyInviteBanner.tsx`, `RallyRidesBanner.tsx`, `LocationSharingBanner.tsx`, `WelcomeBackOverlay.tsx`.
  - Skip `components/ui/*` primitives (shadcn — leave alone) and `EventPhotoFeed` (already safe).
- Add to `src/index.css`:
  - `html { -webkit-tap-highlight-color: transparent; }`
  - `input, textarea, select { font-size: max(16px, 1rem); }` scoped under a `.native` body class so web typography isn't affected. The `.native` class gets toggled in `nativeBootstrap.ts` when `Capacitor.isNativePlatform()` is true.
  - `body { background: hsl(var(--background)); }` to kill white-edge bleed on rubber-band scroll.
- `NotFound.tsx`: `min-h-screen` → `min-h-[100dvh]`.

---

## Out of Scope (explicit)

- No changes to splash/status-bar plugin config (#7) or haptics coverage (#9) — separate pass.
- No changes to `src/integrations/supabase/*`, no DB migrations.
- No business-logic changes to friends/contacts hooks; this is presentation + native-link routing only.

---

## Files Touched (estimated)

Redesign: `src/components/contacts/AddPeopleSheet.tsx`.
Native sweep: `usePhoneInvites.tsx`, `SquadInviteDialog.tsx`, `RideshareDrawer.tsx`, `RideshareDeepLinkButtons.tsx`, `AttendeeMap.tsx`, `LiveTracking.tsx`, `ReturningAuth.tsx`, `ContactInviteDialog.tsx`, `NotFound.tsx`, `src/index.css`, `src/lib/nativeBootstrap.ts`, and the ~10 overlay components listed in 2d.

## Validation

- After the redesign: open the sheet at mobile viewport, verify both search bars are independent, both collapsibles default closed, web Tabs block is hidden when `Capacitor.isNativePlatform()` returns true (simulate by temporarily forcing).
- `rg "google\.com/maps" src/` should return only `nativeLinks.ts`.
- `rg "sms:\$\{|mailto:\$\{" src/` should return zero hits outside `nativeLinks.ts`.
- `rg "if \(true\)" src/` returns zero.
