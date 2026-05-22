## Native Polish — Pass A + B + C (combined)

All three passes in one approval. Strict `Capacitor.isNativePlatform()` gating throughout — web/PWA flow untouched.

> Note: `src/components/FlagSplash.tsx` was already deleted as part of this audit (it was unreferenced).

---

### Pass A — Native link & asset polish

**A1. Route every `target="_blank"` through native helpers**

Add an `onClick` handler that calls `openExternalLink(url)` / `openDirectionsLink(url)` and short-circuits with `e.preventDefault()` on native. On web the anchor behaves normally (new tab). Files:

| File | Helper |
|---|---|
| `src/components/location/LocationMapPreview.tsx` (2 anchors) | `openDirectionsLink` |
| `src/components/rides/NavigateToPickupButton.tsx` (2 anchors) | `openDirectionsLink` |
| `src/components/events/AfterRallyCard.tsx` (Get Directions) | `openDirectionsLink` |
| `src/components/tracking/AttendeeMap.tsx` (Open in Maps) | `openDirectionsLink` |
| `src/components/tracking/AttendeeLocationItem.tsx` (Navigate) | `openDirectionsLink` |
| `src/components/events/EventPhotoFeed.tsx` (Open video) | `openExternalLink` |
| `src/components/chat/unified/MessageBubble.tsx` (user URLs) | `openExternalLink` |
| `src/components/payments/ClaimItemsView.tsx` (receipt) | `openExternalLink` |
| `src/components/onboarding/FoundingMemberBanner.tsx` (Canny) | `openExternalLink` |
| `src/pages/Documentation.tsx` (mermaid.live) | `openExternalLink` |

Pattern applied to each:
```tsx
<a
  href={url}
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => {
    if (Capacitor.isNativePlatform()) {
      e.preventDefault();
      void openExternalLink(url); // or openDirectionsLink
    }
  }}
>
```

**A2. Manifest sync** — `public/manifest.json`: `background_color` `#F47A19` → `#0F172A` (matches native splash).

**A3. apple-touch-icon refresh** — `index.html` line 22: `/rally-icon-192.png` → `/rally-icon-192-v6.png` (matches manifest v6).

**A4. FlagSplash removed** — done (unreferenced file deleted).

---

### Pass B — Discoverability

**B1. Home: always show Past R@llies section** (`src/pages/Index.tsx` lines 260–282)

Remove the outer `{pastEvents.length > 0 && (...)}` wrapper. Header + "See All" always render. When empty, render a soft glass card:

```tsx
<section className="space-y-4">
  <div className="flex items-center justify-between">
    {/* header + See All — unchanged */}
  </div>
  {pastEvents.length > 0 ? (
    <div className="space-y-4 opacity-80">
      {pastEvents.slice(0, 3).map(e => <EventCard key={e.id} event={e} />)}
    </div>
  ) : (
    <Card className="glass-elevated rounded-2xl">
      <CardContent className="p-6 text-center">
        <p className="text-sm text-muted-foreground font-montserrat">
          Your past nights will show up here.
        </p>
      </CardContent>
    </Card>
  )}
</section>
```

**B2. Profile: add "Past R@llies" row** (`src/pages/Profile.tsx`, insert before line 701 — "App Settings" block)

```tsx
<div className="pt-3 border-t border-border">
  <button
    onClick={() => navigate('/rallies/past')}
    className="w-full flex items-center justify-between py-2 hover:bg-muted/50 rounded-lg px-1 transition-colors"
  >
    <div className="flex items-center gap-3">
      <History className="h-5 w-5 text-muted-foreground" />
      <div className="text-left">
        <span className="font-medium">Past R@llies</span>
        <p className="text-xs text-muted-foreground">Your full night archive</p>
      </div>
    </div>
    <ChevronRight className="h-5 w-5 text-muted-foreground" />
  </button>
</div>
```

Add `History` to the lucide-react import on line 15.

---

### Pass C — Branded "Welcome Back" transition (native only)

**C1. New component** — `src/components/WelcomeBackOverlay.tsx`

- Renders only when `Capacitor.isNativePlatform()` is true.
- Once per session (sessionStorage key `rally-welcome-back-shown`).
- Centered `/logo.svg` + "R@lly" wordmark over `#0F172A`, gentle 1.2s pulse, orange radial glow.
- Hard cap: **1.2s total** (920ms hold + 280ms fade-out).
- `z-[100]`, fixed, becomes pointer-events-none during fade so it never blocks taps.

```tsx
const MAX_DURATION_MS = 1200;
const FADE_MS = 280;
const SESSION_KEY = 'rally-welcome-back-shown';
// pulse keyframes inline, no Tailwind config change
```

**C2. Wire into Home** (`src/pages/Index.tsx`)

Import and render `<WelcomeBackOverlay />` at the top of the authenticated `Index` return — outside main scroll area. It self-removes after 1.2s and skips entirely on web, so no impact on the PWA or browser experience.

---

### Web/PWA safety summary

- Every behavior change is wrapped in `Capacitor.isNativePlatform()`.
- Anchors retain `href` + `target="_blank"` so right-click / middle-click / desktop SEO still work.
- Manifest color is purely visual (PWA splash on Android) — no functional impact.
- WelcomeBackOverlay early-returns `null` on web.

---

### Files touched

```text
edited:   src/pages/Index.tsx
edited:   src/pages/Profile.tsx
edited:   src/components/location/LocationMapPreview.tsx
edited:   src/components/rides/NavigateToPickupButton.tsx
edited:   src/components/events/AfterRallyCard.tsx
edited:   src/components/tracking/AttendeeMap.tsx
edited:   src/components/tracking/AttendeeLocationItem.tsx
edited:   src/components/events/EventPhotoFeed.tsx
edited:   src/components/chat/unified/MessageBubble.tsx
edited:   src/components/payments/ClaimItemsView.tsx
edited:   src/components/onboarding/FoundingMemberBanner.tsx
edited:   src/pages/Documentation.tsx
edited:   public/manifest.json
edited:   index.html
created:  src/components/WelcomeBackOverlay.tsx
deleted:  src/components/FlagSplash.tsx   (already done)
```

No DB, RLS, edge function, or schema changes.