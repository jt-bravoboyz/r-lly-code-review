# Add Uber + Lyft Deep Link Buttons to Rides Tab

Purely additive change. New row of two side-by-side rideshare buttons inserted at the very top of the `rides` TabsContent on the rally detail page, above the existing "Need a Ride?" section. No existing logic, styling, or components are modified.

## Files

### 1. NEW: `src/components/rides/RideshareDeepLinkButtons.tsx`

A self-contained component that renders two buttons in a single horizontal row.

Props:
- `eventLat?: number | null`
- `eventLng?: number | null`
- `eventName?: string | null`
- `eventAddress?: string | null`

Behavior:
- Renders two glass-styled buttons in a flex row with `gap-3`, each `flex-1`, height `h-14` (~56px), `rounded-xl`.
- Glass treatment: `bg-white/55 dark:bg-black/45 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.15)]`, with `hover:border-primary/40 hover:shadow-[0_0_0_1px_hsl(22_90%_52%/0.2),0_8px_24px_hsl(22_90%_52%/0.18)]` for the orange accent on hover/press, and `active:scale-[0.97] transition-all`.
- Each button content: small monochrome white wordmark SVG (`h-4`) inline + label "Uber" / "Lyft" (font-semibold) + small muted subtext "Open app" (`text-[10px] text-muted-foreground`).
- Wordmark SVGs are inline (simple `<svg>` text with white fill) — no external assets.
- On click:
  - Uber URL: if `eventLat && eventLng`, build `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(name)}&dropoff[formatted_address]=${encodeURIComponent(address)}` (omitting empty name/address params); else fallback `https://m.uber.com/`.
  - Lyft URL: if coords, `https://lyft.com/ride?id=lyft&pickup=current&destination[latitude]=${lat}&destination[longitude]=${lng}`; else fallback `https://lyft.com/`.
  - Open with `window.open(url, '_blank', 'noopener,noreferrer')`.
  - Trigger `useHaptics().triggerButtonFeedback()` for tactile press.
  - `trackEvent('rideshare_deeplink_clicked', { provider })`.

### 2. EDIT: `src/pages/EventDetail.tsx`

Add import:
```ts
import { RideshareDeepLinkButtons } from '@/components/rides/RideshareDeepLinkButtons';
```

Insert as the first child inside `<TabsContent value="rides" ...>` (line ~1103), before the DD Request Banner block:

```tsx
<RideshareDeepLinkButtons
  eventLat={event.location_lat}
  eventLng={event.location_lng}
  eventName={event.title}
  eventAddress={event.location_name}
/>
```

The existing `space-y-4` on TabsContent provides the rhythm spacing to the "Need a Ride?" section below.

## Out of scope
- No changes to `RideshareDrawer`, `RequestRideDialog`, RiderLine, DD section, or any other tab.
- No changes to other pages, hooks, edge functions, migrations, or design tokens.
- Does not touch Dress Code, Song Rec's, alerts dedup, R@lly Feed placeholder, or Founder 25.
